import { ApiErrorCode } from '../models/api-error.models';

/**
 * French translation of the errors sent by the API.
 *
 * Every business error has a stable `code`: it selects the French sentence. The English `message`
 * only fills the details (name, amount, status...). When the code is missing (old backend, unit test)
 * the sentence is found from the English message, and `apiErrorCode` derives the code the same way.
 * An error added on the backend must be added here too, otherwise a generic French message is shown.
 */

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'en attente',
  CONFIRMED: 'confirmée',
  SHIPPED: 'expédiée',
  DELIVERED: 'livrée',
  CANCELLED: 'annulée',
  DRAFT: 'brouillon',
  ISSUED: 'émise',
  PAID: 'payée',
  OVERDUE: 'en retard'
};

const status = (value: string) => STATUS_LABELS[value] ?? value;

/** The API writes amounts the English way (1234.500): they are shown the French way (1 234,500). */
const money = (value: string) => {
  const amount = Number(value);
  return Number.isFinite(amount)
    ? amount.toLocaleString('fr-FR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })
    : value;
};

/**
 * [code, pattern of the English message, French sentence from the captured details,
 *  French sentence when the details are not available (optional when the sentence has no detail)].
 */
type Rule = [ApiErrorCode, RegExp, (...groups: string[]) => string, string?];

const RULES: Rule[] = [
  // Authentication and rights
  ['INVALID_CREDENTIALS', /^Invalid credentials or inactive account$/, () => 'Email ou mot de passe incorrect, ou compte désactivé.'],
  ['UNAUTHENTICATED', /^Authentication required/, () => 'Votre session a expiré. Veuillez vous reconnecter.'],
  ['ACCESS_DENIED', /^Access denied/, () => 'Vous n\'avez pas les droits nécessaires pour cette action.'],

  // Generic
  ['MALFORMED_REQUEST', /^Malformed or missing request body$/, () => 'La requête envoyée est invalide.'],
  ['DATA_INTEGRITY_VIOLATION', /^Data integrity violation$/,
    () => 'Opération impossible : ces données sont liées à d\'autres enregistrements.'],
  ['INVALID_PARAMETER', /^Invalid value for parameter '(.+)'$/, name => `Valeur invalide pour le paramètre « ${name} ».`,
    'Une valeur envoyée est invalide.'],
  ['CONCURRENT_MODIFICATION', /modified by someone else/,
    () => 'Cet élément a été modifié entre-temps : rechargez la page et réessayez.'],
  ['RESOURCE_NOT_FOUND', /^(\w+) not found with id (\d+)$/, () => 'Élément introuvable : il a peut-être été supprimé.'],

  // Categories
  ['CATEGORY_NAME_ALREADY_USED', /^Category name already in use(?:: (.+))?$/,
    name => `Le nom de catégorie « ${name} » est déjà utilisé.`, 'Ce nom de catégorie est déjà utilisé.'],
  ['CATEGORY_HAS_SUBCATEGORIES', /^Category has sub-categories/,
    () => 'Cette catégorie contient des sous-catégories : supprimez-les ou déplacez-les d\'abord.'],
  ['CATEGORY_USED_BY_PRODUCTS', /^Category is used by products/,
    () => 'Cette catégorie est utilisée par des produits : elle ne peut pas être supprimée.'],
  ['CATEGORY_IN_USE', /^Category is in use/, () => 'Cette catégorie est utilisée : elle ne peut pas être supprimée.'],
  ['PARENT_CATEGORY_NOT_FOUND', /^Parent category not found/, () => 'La catégorie parente n\'existe plus.'],
  ['CATEGORY_CYCLE', /^A category cannot be its own parent/,
    () => 'Une catégorie ne peut pas être sa propre parente ni celle d\'une de ses sous-catégories.'],

  // Customers and users
  ['EMAIL_ALREADY_USED', /^Email already in use(?:: (.+))?$/,
    email => `L'email ${email} est déjà utilisé.`, 'Cet email est déjà utilisé.'],
  ['TAX_NUMBER_ALREADY_USED', /^Tax number already in use(?:: (.+))?$/,
    tax => `Le matricule fiscal ${tax} est déjà utilisé.`, 'Ce matricule fiscal est déjà utilisé.'],
  ['CUSTOMER_INACTIVE', /^Customer is inactive/, () => 'Ce client est inactif.'],

  // Products and stock
  ['REFERENCE_ALREADY_USED', /^Reference already in use(?:: (.+))?$/,
    ref => `La référence ${ref} est déjà utilisée.`, 'Cette référence est déjà utilisée.'],
  ['PRODUCT_INACTIVE', /^Product is inactive(?:: (.+))?$/,
    ref => `Le produit ${ref} est inactif.`, 'Ce produit est inactif.'],
  ['INSUFFICIENT_STOCK', /^Insufficient stock for (.+): available (-?\d+), requested (\d+)$/,
    (ref, available, requested) => `Stock insuffisant pour ${ref} : ${available} disponible(s), ${requested} demandé(s).`,
    'Stock insuffisant.'],
  ['INSUFFICIENT_STOCK', /^Insufficient stock: available (-?\d+), requested change (-?\d+)$/,
    (available, change) => `Stock insuffisant : ${available} disponible(s), variation demandée ${change}.`,
    'Stock insuffisant.'],

  // Orders
  ['DUPLICATE_ORDER_PRODUCT', /^Product appears more than once in the order/,
    () => 'Un même produit apparaît plusieurs fois dans la commande.'],
  ['ORDER_NOT_MODIFIABLE', /^Only PENDING orders can be modified, current status: (\w+)$/,
    current => `Seules les commandes en attente peuvent être modifiées (statut actuel : ${status(current)}).`,
    'Seules les commandes en attente peuvent être modifiées.'],
  ['INVALID_ORDER_TRANSITION', /^Cannot change order status from (\w+) to (\w+)$/,
    (from, to) => `Impossible de passer une commande de « ${status(from)} » à « ${status(to)} ».`,
    'Ce changement de statut de la commande n\'est pas autorisé.'],
  ['ORDER_HAS_ACTIVE_INVOICE', /^Cannot cancel order (.+): it has an active invoice/,
    order => `Impossible d'annuler la commande ${order} : annulez d'abord sa facture.`,
    'Impossible d\'annuler cette commande : annulez d\'abord sa facture.'],

  // Invoices and payments
  ['ORDER_NOT_INVOICEABLE', /^Cannot invoice an order with status (\w+)/,
    current => `Une commande ${status(current)} ne peut pas être facturée : elle doit être confirmée, expédiée ou livrée.`,
    'Cette commande ne peut pas être facturée : elle doit être confirmée, expédiée ou livrée.'],
  ['ORDER_ALREADY_INVOICED', /^Order already invoiced(?:: (.+))?$/,
    order => `La commande ${order} est déjà facturée.`, 'Cette commande est déjà facturée.'],
  ['DISCOUNT_EXCEEDS_TOTAL', /^Discount cannot exceed the order total(?:: (.+))?$/,
    total => `La remise ne peut pas dépasser le total de la commande (${money(total)} TND).`,
    'La remise ne peut pas dépasser le total de la commande.'],
  ['DUE_DATE_BEFORE_ISSUE_DATE', /^Due date cannot be before the issue date/,
    () => 'L\'échéance ne peut pas précéder la date d\'émission.'],
  ['INVOICE_NOT_CANCELLABLE', /^Cannot cancel an invoice with status (\w+)$/,
    current => `Une facture ${status(current)} ne peut pas être annulée.`, 'Cette facture ne peut pas être annulée.'],
  ['INVOICE_HAS_PAYMENTS', /^Cannot cancel an invoice that already has payments/,
    () => 'Une facture qui a déjà reçu des paiements ne peut pas être annulée.'],
  ['INVOICE_NOT_PAYABLE', /^Cannot register a payment on an invoice with status (\w+)$/,
    current => `Impossible d'enregistrer un paiement sur une facture ${status(current)}.`,
    'Impossible d\'enregistrer un paiement sur cette facture.'],
  ['PAYMENT_EXCEEDS_REMAINING', /^Payment exceeds the remaining balance: (.+) left on invoice (.+)$/,
    (left, invoice) => `Le paiement dépasse le reste à payer de la facture ${invoice} (${money(left)} TND).`,
    'Le paiement dépasse le reste à payer de la facture.'],

  // Users
  ['CANNOT_CHANGE_OWN_EMAIL', /^You cannot change your own email$/, () => 'Vous ne pouvez pas modifier votre propre email.'],
  ['CANNOT_CHANGE_OWN_ROLE', /^You cannot change your own role$/, () => 'Vous ne pouvez pas modifier votre propre rôle.'],
  ['CANNOT_DEACTIVATE_OWN_ACCOUNT', /^You cannot deactivate your own account$/,
    () => 'Vous ne pouvez pas désactiver votre propre compte.'],
  ['CANNOT_DELETE_OWN_ACCOUNT', /^You cannot delete your own account$/,
    () => 'Vous ne pouvez pas supprimer votre propre compte.'],
  ['USER_HAS_RECORDS', /^User is linked to existing records/,
    () => 'Cet utilisateur est lié à des enregistrements : désactivez-le plutôt.'],

  // Password change
  ['INVALID_CURRENT_PASSWORD', /^Current password is incorrect/, () => 'Le mot de passe actuel est incorrect.'],
  ['NEW_PASSWORD_SAME_AS_CURRENT', /^The new password must be different/,
    () => 'Le nouveau mot de passe doit être différent de l\'actuel.']
];

/** The French sentence of a rule; the one without details when the message did not give them all. */
function render([, , translate, plain]: Rule, match: RegExpExecArray): string {
  const groups = match.slice(1);
  return plain !== undefined && groups.some(group => group === undefined) ? plain : translate(...groups);
}

/** The code of a known English message (errors sent without a code), or null. */
export function codeFromMessage(message: string): ApiErrorCode | null {
  const text = message.trim();
  return RULES.find(([, pattern]) => pattern.test(text))?.[0] ?? null;
}

/** The French version of an API message alone, or null when the message is unknown. */
export function translateApiMessage(message: string): string | null {
  const text = message.trim();
  for (const rule of RULES) {
    const match = rule[1].exec(text);
    if (match) {
      return render(rule, match);
    }
  }
  return null;
}

/**
 * The French version of an API error: the code chooses the sentence, the message gives its details.
 * Null when neither is known (the caller then falls back on a generic message).
 */
export function translateApiError(code: string | null | undefined, message: string): string | null {
  const rules = RULES.filter(([ruleCode]) => ruleCode === code);
  if (rules.length === 0) {
    return translateApiMessage(message);
  }
  const text = message.trim();
  for (const rule of rules) {
    const match = rule[1].exec(text);
    if (match) {
      return render(rule, match);
    }
  }
  const [, , translate, plain] = rules[0];
  return plain ?? translate();
}
