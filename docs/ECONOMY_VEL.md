# ECONOMY_VEL.md — Oro, $VEL y el gate de acceso

Diseño de la capa económica de token de **Velgrim**. Complementa a `ECONOMY.md` (la economía
del juego: oro, recursos, marketplace, banco) con **la decisión concreta sobre el token $VEL**.

> **Regla madre (de `ECONOMY.md`):** la economía vive o muere por el balance **fuentes vs.
> sumideros**. Y **el servidor manda**: todo el oro se valida server-side. El token es una capa
> aparte, posterior y sensible a regulación — el juego tiene que sentirse justo **sin** él.

---

## 1. La decisión: Velgrim es *play-to-access*, no *play-to-earn* (por ahora)

A diferencia de Kintara (play-to-**earn**: ganás oro → lo cambiás por token → retirás), Velgrim
arranca como **play-to-access** (membership):

- **El oro queda 100% cerrado dentro del juego.** Nunca se convierte en $VEL.
- **$VEL solo se compra en el mercado abierto (pump.fun).** El juego **no lo imprime ni lo
  reparte**: solo **lee el balance** de tu wallet para dejarte entrar.
- La única exigencia del token es **holdear un mínimo para jugar** (gate de acceso).

Esto nos saca de encima toda la parte pesada de P2E/regulación: no hay tesoro que pague cash-out,
no hay token que el juego distribuya, no hay liquidación on-chain de por medio. El juego solo
**consulta** un balance en Solana.

### Por qué es más limpio que Kintara
Oro y $VEL quedan **totalmente desacoplados**. El oro es la economía de juego; su inflación es un
tema de *feel*, no una amenaza al precio del token. $VEL es un **activo externo** que el jugador
compra y tiene. El juego jamás lo toca.

---

## 2. Las tres monedas (no se mezclan)

| Moneda | Qué es | De dónde sale | En qué se gasta | ¿Cripto? |
|---|---|---|---|---|
| **Oro** | Moneda de juego, el día a día | Matar, cofres, misiones, vender loot | Reparar, forjar, respec, ofrendas, gremio, mercado P2P (en oro) | No |
| **Fragmentos de sello** | Premium NO cripto | Misiones diarias, ofrendas | Cofres de sello (loot de mejor calidad) | No |
| **$VEL** | Token de acceso (Solana) | **Solo pump.fun** (mercado abierto) | Holdear para entrar (+ premium a futuro) | Sí |

---

## 3. Cómo funciona el oro hoy (números reales del código)

### Fuentes (crean oro)
| Fuente | Monto | Archivo |
|---|---|---|
| Oro inicial | **200** | `shared/starterkit.js` (`STARTING_GOLD`) |
| Matar enemigo | `2 + 3×nivel` ×(0.7–1.3) | `shared/bestiary.js`, `server/world/combat.js` |
| Elite/boss | base ×2.5 (nivel 7) | `server/world/combat.js` |
| **Cofres** | **55–390** por cofre (por tabla `chest_level_1..16`) | `shared/loot.json` |
| Misiones diarias | 40–140 c/u (3 por día) | `shared/missions.js` |
| Cofres de sello | tabla de cofre por nivel | `server/world/rooms.js` |
| Quest (guardianes) | 150 (una vez) | `server/world/rooms.js` |
| Vender loot al mercader | **25% del precio** del ítem | `shared/items.js` (`SELL_RATIO`) |

### Sumideros (queman/escrowan oro)
| Sumidero | Monto | Tipo |
|---|---|---|
| Spread del mercader | vendés a 25%, comprás a 100% → **4:1** | quema estructural |
| Reparar | `ceil(durabilidad_faltante × 1.5)` | quema recurrente chica |
| Forjar (+1..+5) | `60 + tier×10 + nivel_up×50` (+ cristales) | quema por ítem |
| Respec | `50 + 25×nivel` | quema |
| Ofrenda (misión diaria) | **200/día** | quema |
| Fundar gremio | **500** (una vez) | quema pura |
| Donar al gremio | variable | sumidero (no retirable) |
| Comisión del mercado P2P | **5%** | quema |
| Tumba al morir | 25% del oro (recuperable; se pierde si no la buscás) | riesgo |

### ⚠️ Diagnóstico: el oro **tiende a inflarse**
El faucet fuerte son los **cofres** (55–390 c/u, 2 por entrada de mapa, respawn 30–90s) + **vender
loot**. Los sumideros recurrentes (reparar/forjar/respec) son modestos y en su mayoría *one-time
por ítem*. El sumidero estructural más grande —el spread 4:1— **solo muerde si comprás al NPC**, y
el endgame no compra ahí.

**Falta un sumidero de oro continuo de endgame.** Con el modelo *membership* esto es un tema de
*feel* (no amenaza al token porque el oro está cerrado), pero **hay que resolverlo antes de
cualquier Fase 3** (ver §7). Ideas de sink continuo: loot-boxes comprables en oro, cosméticos,
mantenimiento/upkeep, costos de forja de alto nivel más agresivos.

### Deudas técnicas del oro (encontradas en auditoría)
1. **Costos client-side:** reparar/forjar/respec/ofrenda mandan el **monto calculado por el
   cliente**; el server solo chequea que alcance (no lo recalcula). No se puede mintear ni quedar
   negativo, pero un cliente tramposo podría *pagar de menos*. → **Recalcular esos costos en el
   server.**
2. **Oro de la tumba en memoria:** `p._grave` vive solo en RAM; una desconexión antes de
   recuperarla lo destruye (sink no intencional + bug de UX). → Persistir o avisar.

---

## 4. $VEL: qué es y qué NO es

**Es:** un token de Solana, lanzado en **pump.fun**, que el jugador **compra y holdea** para tener
acceso al juego. Precio lo descubre el mercado abierto.

**NO es (por ahora):** una recompensa que se gana jugando, ni algo que el juego reparta, custodie o
imprima. El oro **no** se cambia por $VEL.

### Comparación con Kintara
| | Kintara ($KINS) | Velgrim ($VEL) |
|---|---|---|
| Oro → token | Sí — marketplace P2P, split 95/5 | **No (Fase 1–2). Sí en Fase 3 (futuro).** |
| Comprar el token | DEX + marketplace in-game | **Solo pump.fun** |
| Hold para jugar | 1.000 KINS (fijo) | **Mínimo en USD, dinámico** |
| De dónde sale el token del marketplace | de **otro jugador** (P2P); el juego no lo imprime | N/A hasta Fase 3 |
| Sink de token | Spinner ~$3, 50% quema / 50% tesoro | Spinner (promesa futura) |
| Modelo | Play-to-earn | **Play-to-access** |

> **Cómo funciona el marketplace oro↔KINS en Kintara (para tenerlo claro):** es un intercambio
> **entre jugadores**. El que tiene tiempo junta oro y lo vende por KINS; el que tiene plata compra
> KINS en el DEX y lo gasta en oro. El juego hace de escrow y se queda el 5%. El KINS **circula**,
> no se imprime. Esa es exactamente la Fase 3 de abajo — para cuando las bases aguanten.

---

## 5. Uso 1 — Gate de acceso dinámico (lo que se construye ahora)

**Qué:** para entrar, tu wallet tiene que holdear **al menos `$X` USD en $VEL**. La **cantidad de
tokens flota con el precio**: fijamos el USD, no la cantidad. "Millones cuando barato, miles cuando
caro."

**Cómo (en `server/systems/wallet.js`, `meetsTokenGate`):**
1. Si no hay `VEL_MINT` seteado → **gate apagado**, cualquiera entra (estado actual).
2. Con `VEL_MINT` seteado:
   - Se lee el **balance** de $VEL de la wallet vía `getTokenAccountsByOwner` (RPC de Solana).
   - Si `VEL_MIN_USD > 0`: se pide el **precio** de $VEL a un **oráculo** (Jupiter Price API por
     defecto), se calcula `tokens_requeridos = VEL_MIN_USD / precio`, y se exige `balance ≥
     tokens_requeridos`. El precio se cachea ~60s.
   - Si no, se usa el mínimo fijo `VEL_MIN` (en tokens) como fallback.
3. **Fail-closed:** ante error de RPC o de oráculo, **no** se deja pasar.

**Se chequea al login** (`walletVerify`), que es cuando la wallet firma el desafío. Es un
*snapshot* al entrar.

### Calibración (ejemplo con `VEL_MIN_USD = 3`)
| Precio $VEL | Tokens para $3 |
|---|---|
| $0.000003 | 1.000.000 |
| $0.00001 | 300.000 |
| $0.0001 | 30.000 |
| $0.001 | 3.000 |
| $0.01 | 300 |

El número lo calcula el oráculo en vivo — vos solo fijás el USD.

### Variables de entorno
| Env | Qué hace | Default |
|---|---|---|
| `VEL_MINT` | Dirección del token en Solana. **Sin esto, gate apagado.** | (vacío) |
| `VEL_MIN_USD` | Mínimo en USD (ej. `3`). Prende el modo dinámico. | `0` |
| `VEL_MIN` | Mínimo fijo en tokens (fallback si no hay USD). | `0` |
| `VEL_ORACLE` | Endpoint de precio (Jupiter Price API por defecto). | Jupiter |
| `SOLANA_RPC` | RPC para leer el balance. | mainnet-beta |

---

## 6. Uso 2 — Premium / spinner que quema $VEL (**promesa a futuro**)

Anotado, **no se construye ahora.** Igual que el spinner de Kintara (~$3 en token, 50% quema / 50%
tesoro), pero pagado en **$VEL comprado en pump.fun** (no en oro, para mantener el oro cerrado). Le
daría a $VEL **demanda continua + presión deflacionaria** más allá del peaje de entrada. Candidatos:
ruleta de loot, cosméticos, estandartes de gremio.

---

## 7. Fase 3 — Marketplace oro↔$VEL P2P (**futuro, alto riesgo**)

El modelo completo tipo Kintara: los jugadores intercambian **oro ↔ $VEL entre ellos** (dos lados,
el juego escrow + comisión). Es la visión final, pero es un **salto grande**:

1. **Legal/regulatorio:** facilitar oro↔token con valor real = play-to-earn / RMT con plata real.
   Otra liga de exposición.
2. **Liquidación on-chain:** el $VEL tiene que moverse de verdad entre wallets. Implica settlement
   firmado (no-custodial) o custodia (riesgoso). Es ~10× el trabajo del gate (que solo *lee*).
3. **El balance del oro se vuelve existencial:** si el oro se infla, tira el precio del token. Los
   sumideros de §3 dejan de ser opcionales.

**No se toca hasta que:** el mundo esté vivo, el server sea sólido, los sumideros de oro estén
apretados y lo legal/custodia esté resuelto.

---

## 8. Roadmap por fases

| Fase | Qué | Riesgo | Cuándo |
|---|---|---|---|
| **1 — Membership** | Gate de acceso dinámico (holdear $VEL de pump.fun). Oro cerrado. | Bajo | Ahora (apagado hasta que exista el token) |
| **2 — Apretar el oro** | Sumideros de endgame + recalcular costos en server (§3) | Bajo | Antes de Fase 3 |
| **3 — Marketplace oro↔$VEL** | El P2P bidireccional, con settlement on-chain | **Alto** | Cuando las bases aguanten plata real |
| **(paralelo) Premium** | Spinner/cosméticos que queman $VEL | Medio | Cuando exista el token |

No se pasa de fase sin que la anterior esté **terminada de punta a punta** (regla 4 del CLAUDE.md).

---

## 9. Estado de implementación

- ✅ Login por wallet (Sign-In-With-Solana, ed25519) — `server/systems/wallet.js`.
- ✅ Gate scaffoldeado (mínimo fijo `VEL_MIN`) — **apagado** sin `VEL_MINT`.
- ✅ Wallet obligatoria en producción (`WALLET_REQUIRED`).
- ⏳ **Gate dinámico en USD** (`VEL_MIN_USD` + oráculo) — este documento.
- ⛔ Premium/spinner — promesa futura.
- ⛔ Marketplace oro↔$VEL — Fase 3.
