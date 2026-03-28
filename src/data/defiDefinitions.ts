/**
 * Definiciones para la vista Defi.Deal (glosario DeFi / términos)
 */

export interface DefinitionItem {
  id: string;
  term: string;
  termEs: string;
  definition: string;
  definitionEs: string;
}

export const DEFI_DEFINITIONS: DefinitionItem[] = [
  {
    id: '0',
    term: 'Deal',
    termEs: 'Deal',
    definition: 'A "Deal" is a special promotion created by brands and shared by influencers to offer exclusive discounts to their followers. It\'s the smartest way to connect brands with real audiences.',
    definitionEs: 'Un "Deal" es una promoción especial creada por marcas y difundida por influencers para ofrecer descuentos exclusivos a sus seguidores. Es la forma más inteligente de conectar marcas con audiencias reales.',
  },
  {
    id: '1',
    term: 'DeFi',
    termEs: 'DeFi',
    definition: 'Decentralized Finance. Financial services (lending, trading, insurance) built on blockchain without central intermediaries.',
    definitionEs: 'Finanzas descentralizadas. Servicios financieros (préstamos, trading, seguros) construidos en blockchain sin intermediarios centrales.',
  },
  {
    id: '2',
    term: 'Smart contract',
    termEs: 'Contrato inteligente',
    definition: 'Self-executing code on a blockchain that runs when certain conditions are met. Used for agreements and automation.',
    definitionEs: 'Código que se ejecuta en una blockchain cuando se cumplen ciertas condiciones. Se usa para acuerdos y automatización.',
  },
  {
    id: '3',
    term: 'Wallet',
    termEs: 'Billetera',
    definition: 'Software or device that stores private keys and lets you send, receive and manage crypto assets.',
    definitionEs: 'Software o dispositivo que guarda las claves privadas y permite enviar, recibir y gestionar activos cripto.',
  },
  {
    id: '4',
    term: 'Token',
    termEs: 'Token',
    definition: 'Digital asset on a blockchain. Can represent value, rights or utility within a project or ecosystem.',
    definitionEs: 'Activo digital en una blockchain. Puede representar valor, derechos o utilidad dentro de un proyecto o ecosistema.',
  },
  {
    id: '5',
    term: 'Staking',
    termEs: 'Staking',
    definition: 'Locking crypto in a protocol to support the network (e.g. validation) and earn rewards.',
    definitionEs: 'Bloquear cripto en un protocolo para apoyar la red (ej. validación) y ganar recompensas.',
  },
  {
    id: '6',
    term: 'Liquidity pool',
    termEs: 'Pool de liquidez',
    definition: 'Smart contract that holds funds so users can swap tokens (e.g. in AMMs). Liquidity providers earn fees.',
    definitionEs: 'Contrato inteligente que guarda fondos para que los usuarios intercambien tokens (ej. en AMM). Los proveedores de liquidez ganan comisiones.',
  },
  {
    id: '7',
    term: 'APY',
    termEs: 'APY',
    definition: 'Annual Percentage Yield. Estimated yearly return on an investment, including compounding.',
    definitionEs: 'Rendimiento porcentual anual. Rendimiento anual estimado de una inversión, incluyendo capitalización.',
  },
  {
    id: '8',
    term: 'Gas',
    termEs: 'Gas',
    definition: 'Fee paid to the network (validators/miners) to process a transaction on a blockchain.',
    definitionEs: 'Comisión pagada a la red (validadores/mineros) para procesar una transacción en una blockchain.',
  },
  {
    id: '9',
    term: 'NFT',
    termEs: 'NFT',
    definition: 'Non-Fungible Token. Unique digital asset on a blockchain, often used for art, collectibles or proof of ownership.',
    definitionEs: 'Token no fungible. Activo digital único en una blockchain, usado a menudo para arte, coleccionables o prueba de propiedad.',
  },
  {
    id: '10',
    term: 'Yield farming',
    termEs: 'Yield farming',
    definition: 'Earning returns by providing liquidity or staking in DeFi protocols. Higher returns often come with higher risk.',
    definitionEs: 'Obtener rendimientos aportando liquidez o haciendo staking en protocolos DeFi. Mayores rendimientos suelen implicar mayor riesgo.',
  },
];
