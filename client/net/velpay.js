// Pago on-chain del marketplace oro↔$VEL. NO-CUSTODIAL: el comprador firma en SU wallet una
// transferencia SPL de $VEL (95% al vendedor + 5% al tesoro) con un memo que ata la orden, la manda
// a la red, y le pasa la firma al server para que verifique y libere el oro.
//
// @solana/web3.js + @solana/spl-token se cargan con import() DINÁMICO: sólo entran al bundle cuando
// el jugador abre el marketplace de $VEL (chunk aparte), no en el juego base (mobile-first).
import { getProvider } from './wallet.js'

// Programa de memo de Solana (texto libre en la transacción). Lo usamos para el `velmkt:<id>`.
const MEMO_PROGRAM = 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr'

// Firma y manda el pago de una orden. `pay` viene del server (goldmkt_lock): { rpc, mint, decimals,
// seller, treasury, sellerBase, treasuryBase, memo }. Devuelve la firma (string) o tira error.
export async function payOrder(pay) {
  const provider = getProvider()
  if (!provider) throw new Error('no-wallet')
  if (!provider.publicKey) await provider.connect()

  // Buffer lo necesita web3.js en el navegador; lo cargamos acá (sólo cuando se abre el mercado).
  const { Buffer } = await import('buffer')
  if (typeof globalThis.Buffer === 'undefined') globalThis.Buffer = Buffer
  const web3 = await import('@solana/web3.js')
  const spl = await import('@solana/spl-token')
  const { Connection, PublicKey, Transaction, TransactionInstruction } = web3
  const { getAssociatedTokenAddressSync, createTransferCheckedInstruction } = spl

  const buyer = new PublicKey(provider.publicKey.toString())
  const mint = new PublicKey(pay.mint)
  const seller = new PublicKey(pay.seller)
  const treasury = new PublicKey(pay.treasury)

  // Cuentas de token asociadas (ATA) de cada parte. Comprador/vendedor ya tienen $VEL (el gate lo
  // exige); el tesoro se crea una vez al montar el token. No creamos ATAs acá.
  const buyerAta = getAssociatedTokenAddressSync(mint, buyer)
  const sellerAta = getAssociatedTokenAddressSync(mint, seller)
  const treasuryAta = getAssociatedTokenAddressSync(mint, treasury)

  const tx = new Transaction()
  tx.add(createTransferCheckedInstruction(buyerAta, mint, sellerAta, buyer, BigInt(pay.sellerBase), pay.decimals))
  tx.add(createTransferCheckedInstruction(buyerAta, mint, treasuryAta, buyer, BigInt(pay.treasuryBase), pay.decimals))
  tx.add(new TransactionInstruction({ keys: [], programId: new PublicKey(MEMO_PROGRAM), data: Buffer.from(pay.memo, 'utf8') }))

  const conn = new Connection(pay.rpc, 'confirmed')
  const { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash('finalized')
  tx.recentBlockhash = blockhash
  tx.feePayer = buyer

  const res = await provider.signAndSendTransaction(tx)
  const signature = res?.signature || res
  if (!signature) throw new Error('sin firma')
  // Esperamos la confirmación antes de avisar al server (que va a pedir 'finalized').
  try { await conn.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, 'confirmed') } catch {}
  return signature
}
