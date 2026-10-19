/**
 * French translation of the messages sent by the API (field `message` of its JSON errors).
 * The API answers in English with free text: each known message is matched by a pattern.
 * A message added on the backend must be added here too, otherwise a generic French message is shown.
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

type Translation = [RegExp, (...groups: string[]) => string];

const TRANSLATIONS: Translation[] = [
  // Authentication and rights
  [/^Invalid credentials or inactive account$/, () => 'Email ou mot de passe incorrect, ou compte désactivé.'],
  [/^Authentication required/, () => 'Votre session a expiré. Veuillez vous reconnecter.'],
  [/^Access denied/, () => 'Vous n\'avez pas les droits nécessaires pour cette action.'],

  // Generic
  [/^Malformed or missing request body$/, () => 'La requête envoyée est invalide.'],
  [/^Data integrity violation$/, () => 'Opération impossible : ces données sont liées à d\'autres enregistrements.'],
  [/^Invalid value for parameter '(.+)'$/, name => `Valeur invalide pour le paramètre « ${name} ».`],
  [/modified by someone else/, () => 'Cet élément a été modifié entre-temps : rechargez la page et réessayez.'],
  [/^(\w+) not found with id (\d+)$/, () => 'Élément introuvable : il a peut-être été supprimé.'],

  // Categories
  [/^Category name already in use: (.+)$/, name => `Le nom de catégorie « ${name} » est déjà utilisé.`],
  [/^Category has sub-categories/, () => 'Cette catégorie contient des sous-catégories : supprimez-les ou déplacez-les d\'abord.'],
  [/^Category is used by products/, () => 'Cette catégorie est utilisée par des produits : elle ne peut pas être supprimée.'],
  [/^Category is in use/, () => 'Cette catégorie est utilisée : elle ne peut pas être supprimée.'],
  [/^Parent category not found/, () => 'La catégorie parente n\'existe plus.'],
  [/^A category cannot be its own parent/, () => 'Une catégorie ne peut pas être sa propre parente ni celle d\'une de ses sous-catégories.'],

  // Customers
  [/^Email already in use: (.+)$/, email => `L'email ${email} est déjà utilisé.`],
  [/^Tax number already in use: (.+)$/, tax => `Le matricule fiscal ${tax} est déjà utilisé.`],
  [/^Customer is inactive/, () => 'Ce client est inactif.'],

  // Products and stock
  [/^Reference already in use: (.+)$/, ref => `La référence ${ref} est déjà utilisée.`],
  [/^Product is inactive: (.+)$/, ref => `Le produit ${ref} est inactif.`],
  [/^Insufficient stock for (.+): available (-?\d+), requested (\d+)$/,
    (ref, available, requested) => `Stock insuffisant pour ${ref} : ${available} disponible(s), ${requested} demandé(s).`],
  [/^Insufficient stock: available (-?\d+), requested change (-?\d+)$/,
    (available, change) => `Stock insuffisant : ${available} disponible(s), variation demandée ${change}.`],

  // Orders
  [/^Product appears more than once in the order/, () => 'Un même produit apparaît plusieurs fois dans la commande.'],
  [/^Only PENDING orders can be modified, current status: (\w+)$/,
    current => `Seules les commandes en attente peuvent être modifiées (statut actuel : ${status(current)}).`],
  [/^Cannot change order status from (\w+) to (\w+)$/,
    (from, to) => `Impossible de passer une commande de « ${status(from)} » à « ${status(to)} ».`],
  [/^Cannot cancel order (.+): it has an active invoice/,
    order => `Impossible d'annuler la commande ${order} : annulez d'abord sa facture.`],

  // Invoices and payments
  [/^Cannot invoice an order with status (\w+)/,
    current => `Une commande ${status(current)} ne peut pas être facturée : elle doit être confirmée, expédiée ou livrée.`],
  [/^Order already invoiced: (.+)$/, order => `La commande ${order} est déjà facturée.`],
  [/^Discount cannot exceed the order total: (.+)$/, total => `La remise ne peut pas dépasser le total de la commande (${total} TND).`],
  [/^Due date cannot be before the issue date/, () => 'L\'échéance ne peut pas précéder la date d\'émission.'],
  [/^Cannot cancel an invoice with status (\w+)$/, current => `Une facture ${status(current)} ne peut pas être annulée.`],
  [/^Cannot cancel an invoice that already has payments/, () => 'Une facture qui a déjà reçu des paiements ne peut pas être annulée.'],
  [/^Cannot register a payment on an invoice with status (\w+)$/,
    current => `Impossible d'enregistrer un paiement sur une facture ${status(current)}.`],
  [/^Payment exceeds the remaining balance: (.+) left on invoice (.+)$/,
    (left, invoice) => `Le paiement dépasse le reste à payer de la facture ${invoice} (${left} TND).`],

  // Users
  [/^You cannot change your own email$/, () => 'Vous ne pouvez pas modifier votre propre email.'],
  [/^You cannot change your own role$/, () => 'Vous ne pouvez pas modifier votre propre rôle.'],
  [/^You cannot deactivate your own account$/, () => 'Vous ne pouvez pas désactiver votre propre compte.'],
  [/^You cannot delete your own account$/, () => 'Vous ne pouvez pas supprimer votre propre compte.'],
  [/^User is linked to existing records/, () => 'Cet utilisateur est lié à des enregistrements : désactivez-le plutôt.']
];

/** The French version of an API message, or null when the message is unknown. */
export function translateApiMessage(message: string): string | null {
  for (const [pattern, translate] of TRANSLATIONS) {
    const match = pattern.exec(message.trim());
    if (match) {
      return translate(...match.slice(1));
    }
  }
  return null;
}
