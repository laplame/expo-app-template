/**
 * Textos legales / informativos de la billetera (ES + EN).
 * Token: LUXAE · contrato ERC-20 (name): LXD.
 */
import { ERC20_TOKEN_NAME, TOKEN_SYMBOL } from '../constants/luxToken';

export type DisclosureStepCopy = {
  titleEs: string;
  titleEn: string;
  bodyEs: string;
  bodyEn: string;
};

export const WALLET_DISCLOSURE_STEPS: DisclosureStepCopy[] = [
  {
    titleEs: 'Borrar la app o los datos',
    titleEn: 'Uninstalling or clearing data',
    bodyEs:
      'Si desinstalas la aplicación o borras los datos del dispositivo, las claves privadas guardadas aquí pueden perderse de forma irreversible. No podemos recuperar tus fondos por ti. Haz copias de seguridad o exportaciones seguras si tu flujo lo permite.',
    bodyEn:
      'If you uninstall the app or clear app data, private keys stored on this device may be lost permanently. We cannot recover your funds. Use backups or secure export when available.',
  },
  {
    titleEs: 'Una dirección por dispositivo',
    titleEn: 'One primary address per device',
    bodyEs:
      'Se recomienda usar una dirección principal por dispositivo para no perder el rastro de tus fondos y reducir el riesgo de enviar a una cuenta equivocada.',
    bodyEn:
      'We recommend one primary address per device so you can track funds and reduce the risk of sending to the wrong account.',
  },
  {
    titleEs: 'Generar nuevas direcciones',
    titleEn: 'Generating new addresses',
    bodyEs: `Al generar una nueva dirección para el token ${TOKEN_SYMBOL} (ERC-20 ${ERC20_TOKEN_NAME}), se añade otra a la lista; puedes tener varias. Revisa cuál está marcada como predeterminada y confirma la dirección de destino antes de enviar fondos. Eliminar una dirección de la lista no mueve los activos que ya estén en la cadena.`,
    bodyEn: `When you generate a new address for the ${TOKEN_SYMBOL} token (ERC-20 ${ERC20_TOKEN_NAME}), another entry is added; you may have several. Check which is set as default and confirm the destination before sending. Removing an address from the list does not move assets already on-chain.`,
  },
  {
    titleEs: 'Tu responsabilidad',
    titleEn: 'Your responsibility',
    bodyEs: `Los saldos ${TOKEN_SYMBOL} en la app y los activos en cadena dependen de esta instalación y de la red. Tú eres responsable de tus claves, copias de seguridad y transferencias.`,
    bodyEn: `${TOKEN_SYMBOL} balances in the app and on-chain assets depend on this installation and the network. You are responsible for your keys, backups, and transfers.`,
  },
];

export const WALLET_REMINDER_BULLETS: { es: string[]; en: string[] } = {
  es: [
    'Borrar la app o datos puede hacer irreversible la pérdida de claves y fondos.',
    'Usa una dirección principal por dispositivo para seguir mejor tus fondos.',
    `Al generar direcciones para ${TOKEN_SYMBOL} (${ERC20_TOKEN_NAME}), revisa la predeterminada antes de enviar.`,
    'Tú eres responsable de respaldos y transferencias.',
  ],
  en: [
    'Uninstalling or clearing data may permanently lose keys and funds.',
    'Use one primary address per device to track funds more clearly.',
    `When generating addresses for ${TOKEN_SYMBOL} (${ERC20_TOKEN_NAME}), check the default before sending.`,
    'You are responsible for backups and transfers.',
  ],
};

export const WALLET_DISCLOSURE_UI = {
  es: {
    fullTitle: 'Aviso importante',
    fullTitleAlt: 'Important notice',
    next: 'Siguiente',
    back: 'Atrás',
    accept: 'Entendido y continuar',
    later: 'Más tarde',
    reminderTitle: 'Recordatorio · Billetera',
    reminderTitleAlt: 'Reminder · Wallet',
    reminderOk: 'Entendido',
    langLabelEs: 'Español',
    langLabelEn: 'English',
    stepIndicator: (n: number, total: number) => `Paso ${n} de ${total}`,
    stepIndicatorAlt: (n: number, total: number) => `Step ${n} of ${total}`,
  },
  en: {
    fullTitle: 'Important notice',
    fullTitleAlt: 'Aviso importante',
    next: 'Next',
    back: 'Back',
    accept: 'I understand and continue',
    later: 'Remind me later',
    reminderTitle: 'Reminder · Wallet',
    reminderTitleAlt: 'Recordatorio · Billetera',
    reminderOk: 'Got it',
    langLabelEs: 'Español',
    langLabelEn: 'English',
    stepIndicator: (n: number, total: number) => `Step ${n} of ${total}`,
    stepIndicatorAlt: (n: number, total: number) => `Paso ${n} de ${total}`,
  },
} as const;

/** Confirmación al generar dirección para LUXAE (ERC-20 LXD). */
export const GENERATE_LUX_TOKEN_POLYGON_CONFIRM = {
  titleEs: `Generar dirección ${TOKEN_SYMBOL} (${ERC20_TOKEN_NAME})`,
  titleEn: `Generate ${TOKEN_SYMBOL} (${ERC20_TOKEN_NAME}) address`,
  messageEs: `Se añadirá una nueva dirección para el token ${TOKEN_SYMBOL} (ERC-20 ${ERC20_TOKEN_NAME}); no sustituye automáticamente las anteriores. Revisa la dirección predeterminada antes de enviar fondos. ¿Continuar?`,
  messageEn: `A new address will be added for the ${TOKEN_SYMBOL} token (ERC-20 ${ERC20_TOKEN_NAME}); it does not automatically replace previous ones. Check your default address before sending funds. Continue?`,
  buttonGenerateEs: 'Generar',
  buttonGenerateEn: 'Generate',
  buttonCancelEs: 'Cancelar',
  buttonCancelEn: 'Cancel',
} as const;

/** @deprecated Usar GENERATE_LUX_TOKEN_POLYGON_CONFIRM */
export const GENERATE_LUXAE_POLYGON_CONFIRM = GENERATE_LUX_TOKEN_POLYGON_CONFIRM;

export function formatBilingualAlertTitle(es: string, en: string): string {
  return `${es}\n${en}`;
}

export function formatBilingualAlertMessage(es: string, en: string): string {
  return `${es}\n\n${en}`;
}
