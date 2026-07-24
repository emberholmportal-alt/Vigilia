# LAUNCH_VEL.md — Runbook del día del token

Cómo conectar la coin de **pump.fun** a Velgrim el día del lanzamiento (vivo). Todo el código
(gate de acceso + marketplace oro↔$VEL) ya está **construido y dormido**; conectar la coin es
**setear variables de entorno en Render** — cero cambios de código, cero deploy nuevo si las
variables no requieren rebuild del cliente (ver §5).

> **Regla de oro del vivo:** arrancá con el gate **apagado** (que nadie quede afuera), mostrá la
> coin y los links de compra, y recién después endurecé. Es mucho peor lockear a toda la sala que
> tardar un rato en prender el peaje.

---

## 0. Antes del vivo (una vez, sin apuro)

- [ ] **RPC dedicado.** Conseguí un endpoint de Helius / QuickNode / Alchemy (mainnet). El RPC
      público (`api.mainnet-beta.solana.com`) se rate-limitea y tira 429 bajo carga → como el gate
      es *fail-closed*, un RPC caído **deja a todos afuera**. Este es el riesgo #1 del vivo.
- [ ] **Wallet de tesoro** (solo si vas a abrir el marketplace): una wallet Solana **aparte** de la
      tuya personal, que cobre el 5%. Que tenga su **token account de $VEL creada** (recibí 1 token
      de $VEL ahí una vez, así existe la ATA) — si no, las transferencias del 5% fallan.
- [ ] **Dry-run en devnet** (recomendado, ver §6).

---

## 1. Las variables (todas en el dashboard de Render → Environment)

`render.yaml` ya las declara con `sync: false` (Render no las pisa; las ponés a mano el día D).

| Env | Qué hace | Valor el día del vivo |
|---|---|---|
| `VEL_MINT` | **Dirección del contrato de pump.fun.** Sin esto, todo el sistema $VEL está apagado. | el mint de la coin |
| `SOLANA_RPC` | RPC del server (leer balances + verificar pagos). | **tu RPC dedicado** |
| `VEL_SYMBOL` | Símbolo mostrado en la UI. | `VEL` (o el ticker real) |
| `VEL_BUY_URL` | Link de compra. | *(vacío → se arma solo: `pump.fun/coin/<mint>`)* |
| `VEL_MIN_USD` | Mínimo de acceso en USD (modo dinámico por oráculo). | **vacío en T0** (ver §2) |
| `VEL_MIN` | Mínimo fijo en tokens (respaldo si no hay oráculo). | vacío en T0 |
| `VEL_MARKET` | `on` abre el marketplace oro↔$VEL. | vacío en T0 |
| `VEL_TREASURY` | Wallet que cobra el 5% del marketplace. | (con el marketplace) |
| `VEL_RPC_PUBLIC` | RPC público que usa el **cliente** para el blockhash. **NO** pongas acá una RPC con API key privada. | público de mainnet |
| `WALLET_REQUIRED` | Exige login con wallet para jugar (independiente de $VEL). | `1` si querés exigir wallet |

---

## 2. Las dos trampas de lockout (leé esto dos veces)

1. **RPC público bajo carga.** Cada login lee el balance on-chain. Con gente entrando en vivo, el
   RPC público satura y falla → *fail-closed* → **nadie entra**. → **Usá `SOLANA_RPC` dedicado.**

2. **Oráculo + token recién nacido.** Una coin nueva de pump.fun **no está en la Jupiter Price API**
   al instante. Si prendés `VEL_MIN_USD` antes de que tenga precio, la cuenta es `USD ÷ 0 = ∞` →
   nadie cumple → **lockout total**.
   - El código ya tiene **respaldo**: si `VEL_MIN_USD` está prendido pero el oráculo no da precio y
     además hay `VEL_MIN` fijo, usa ese (sigue gateado, no lockea). *(Verificado en
     `wallet.js:meetsTokenGate`.)*
   - Aun así, la jugada segura es **no prender `VEL_MIN_USD` en T0**. Prendelo cuando Jupiter ya
     liste la coin (chequealo en jup.ag/precio).

---

## 3. Secuencia recomendada (el guion del vivo)

### T0 — durante el stream (cero riesgo de lockout)
Seteá **solo**:
```
VEL_MINT      = <mint de pump.fun>
SOLANA_RPC    = <tu RPC dedicado>
VEL_SYMBOL    = VEL
```
Efecto: el juego **conoce la coin**, muestra "$VEL" y el botón de comprar (→ pump.fun). El gate de
acceso queda **apagado** (mínimo 0 = cualquiera con wallet entra). Nadie se queda afuera.
Verificá en el juego: la pantalla de inicio muestra la coin y el link de compra.

### T+ (horas/días) — cuando la coin esté indexada en Jupiter
Prendé el peaje de acceso:
```
VEL_MIN_USD = 3        # ej. 3 USD de $VEL para entrar (flota con el precio)
# opcional, de respaldo si el oráculo se cae:
VEL_MIN     = 30000    # tokens fijos aprox equivalentes
```

### T++ (cuando quieras la economía P2P) — marketplace oro↔$VEL
```
VEL_MARKET   = on
VEL_TREASURY = <wallet del 5%, con ATA de $VEL creada>
```

---

## 4. Rollback en caliente (si algo se rompe en vivo)

- **Se lockeó la sala / RPC caído** → borrá `VEL_MIN_USD` y `VEL_MIN` (o `VEL_MINT`). El gate vuelve
  a apagado al instante (próximo login). Nadie más queda afuera.
- **Problema en el marketplace** → borrá `VEL_MARKET` (o ponelo distinto de `on`). Vuelve a
  `{ off:true }`; el oro escrowed en órdenes abiertas se recupera con `cancel`.
- Los cambios de env en Render aplican en el próximo arranque del server / próximo request según la
  variable; para forzar, redeploy del servicio (segundos).

---

## 5. ¿Rebuild del cliente?

- El **gate y el marketplace del server** leen las env en runtime → **no** requieren rebuild del
  cliente; el cliente pide la config al server (`velinfo` / `goldmkt_config`).
- Solo `VITE_*` (build-time) requeriría rebuild del static site. Las de $VEL **no** son `VITE_*`, así
  que alcanza con setearlas en el server. (El link de compra y el símbolo llegan por la config
  pública del server.)

---

## 6. Dry-run en devnet (probar el cableado sin arriesgar el vivo)

1. Creá un **SPL token de prueba** en devnet (`spl-token create-token --url devnet`).
2. Dos wallets devnet con SOL de faucet + algo del token de prueba; Phantom en **Devnet**.
3. En el server de staging:
   ```
   VEL_MINT        = <mint devnet>
   SOLANA_RPC      = https://api.devnet.solana.com   (o RPC devnet dedicado)
   VEL_RPC_PUBLIC  = https://api.devnet.solana.com
   VEL_MIN         = 1
   VEL_MARKET      = on
   VEL_TREASURY    = <wallet devnet con ATA>
   ```
4. Probá: (a) el gate deja entrar solo si holdeás ≥1 del token; (b) publicar oro pidiendo $VEL;
   (c) comprar y pagar on-chain desde la otra wallet; (d) el server libera el oro tras verificar.
5. Si todo pasa en devnet, el mismo flujo anda en mainnet cambiando el mint y el RPC.

---

## 7. Checklist final del día D

- [ ] RPC dedicado en `SOLANA_RPC`, probado (no 429).
- [ ] `VEL_MINT` = mint real de pump.fun.
- [ ] `VEL_SYMBOL` seteado; link de compra visible en la pantalla de inicio.
- [ ] Gate **apagado** en T0 (sin `VEL_MIN_USD` / `VEL_MIN`).
- [ ] Entraste vos con tu wallet y verificaste que se juega normal.
- [ ] (Después) Jupiter lista la coin → prendés `VEL_MIN_USD`.
- [ ] (Opcional) marketplace con tesoro que tenga ATA.

> **Todo el código está listo y verificado.** Este runbook es solo la secuencia de operación. El
> único trabajo del día D es pegar el mint y elegir cuándo endurecer.
