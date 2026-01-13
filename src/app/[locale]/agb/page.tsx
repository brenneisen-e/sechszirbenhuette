import { setRequestLocale } from 'next-intl/server';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { locale } = await params;
  return {
    title: locale === 'de' ? 'AGB | Sechszirbenhütte' : 'Terms | Sechszirbenhütte',
    description: locale === 'de'
      ? 'Allgemeine Geschäftsbedingungen für die Vermietung der Sechszirbenhütte am Falkert.'
      : 'General Terms and Conditions for renting the Sechszirbenhütte at Falkert.',
    robots: 'noindex, follow',
  };
}

export default async function AGBPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const isDE = locale === 'de';

  return (
    <div className="pt-24 pb-16">
      <div className="container max-w-3xl">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-8">
          {isDE ? 'Allgemeine Geschäftsbedingungen' : 'General Terms and Conditions'}
        </h1>

        <div className="prose prose-gray max-w-none">
          <h2>{isDE ? 'Buchung' : 'Booking'}</h2>
          <ol>
            <li>
              {isDE
                ? 'Mit der Buchung, die schriftlich, mündlich, telefonisch, per Fax oder Email erfolgen kann, reserviert der Gast verbindlich das Mietobjekt.'
                : 'By booking, which can be made in writing, verbally, by telephone, fax or email, the guest makes a binding reservation for the rental property.'}
            </li>
            <li>
              {isDE
                ? 'Der Mietvertrag kommt mit der Rücksendung des unterschriebenen Vertrages innerhalb 1 Woche zustande.'
                : 'The rental agreement comes into effect when the signed contract is returned within 1 week.'}
            </li>
            <li>
              {isDE
                ? 'Bei nicht fristgerechter Rücksendung des Vertrages behält sich der Vermieter vor, das Objekt anderweitig zu vermieten.'
                : 'If the contract is not returned on time, the landlord reserves the right to rent the property elsewhere.'}
            </li>
            <li>
              {isDE
                ? 'Die Buchung erfolgt für den buchenden Gast auch für alle angemeldeten Personen und er haftet auch für diese Mitreisenden.'
                : 'The booking is made for the booking guest as well as for all registered persons and he is also liable for these fellow travelers.'}
            </li>
          </ol>

          <h2>{isDE ? 'Mietpreis' : 'Rental Price'}</h2>
          <ol>
            <li>
              {isDE
                ? 'Der Mietpreis beinhaltet ausschließlich die Miete für die einzelnen Objekte ohne Nebenkosten.'
                : 'The rental price includes only the rent for the individual properties without additional costs.'}
            </li>
            <li>
              {isDE
                ? 'Die anfallenden Nebenkosten werden nach Verbrauch mit unserem Verwalter vor Ort abgerechnet.'
                : 'The incidental costs incurred will be settled according to consumption with our on-site manager.'}
            </li>
            <li>
              {isDE
                ? 'Auf Wunsch können die Nebenkosten im Voraus pauschalisiert werden und zusammen mit dem Mietpreis bezahlt werden.'
                : 'If desired, the additional costs can be charged as a flat rate in advance and paid together with the rental price.'}
            </li>
          </ol>

          <h2>{isDE ? 'Zahlung' : 'Payment'}</h2>
          <ol>
            <li>
              {isDE
                ? 'Gleichzeitig mit der Rücksendung Ihres unterschriebenen Mietvertrages wird eine Anzahlung in Höhe von 25% des Mietpreises fällig.'
                : 'At the same time as returning your signed rental agreement, a deposit of 25% of the rental price is due.'}
            </li>
            <li>
              {isDE
                ? 'Der Restbetrag des Mietpreises ist spätestens 4 Wochen vor Mietbeginn auf das angegebene Konto zu überweisen.'
                : 'The remaining amount of the rental price must be transferred to the specified account at least 4 weeks before the start of the rental.'}
            </li>
            <li>
              {isDE
                ? 'Eine Zahlung mit Scheck ist auch möglich, wobei dieser ebenfalls 4 Wochen vor Mietbeginn beim Vermieter eintreffen muss.'
                : 'Payment by check is also possible, although this must also reach the landlord 4 weeks before the start of the rental.'}
            </li>
            <li>
              {isDE
                ? 'Zahlungsverzug berechtigt den Vermieter zum Rücktritt und zur Berechnung von Schadenersatz.'
                : 'Default of payment entitles the landlord to withdraw and to claim damages.'}
            </li>
          </ol>

          <h2>{isDE ? 'Rücktritt' : 'Cancellation'}</h2>
          <ol>
            <li>
              {isDE
                ? 'Ein Rücktritt (Stornierung) ist jederzeit vor Reisebeginn möglich und muss schriftlich an den Vermieter erfolgen.'
                : 'Cancellation is possible at any time before the start of the trip and must be made in writing to the landlord.'}
            </li>
            <li>
              {isDE
                ? 'Bei Nichtantritt der Reise bleibt der Gast zur vollen Bezahlung des Mietpreises verpflichtet.'
                : 'If the trip is not started, the guest remains obligated to pay the full rental price.'}
            </li>
            <li>
              {isDE
                ? 'Wir empfehlen den Abschluss einer Reiserücktrittversicherung, die im Fall einer Stornierung für die anfallenden Kosten eintritt.'
                : 'We recommend taking out travel cancellation insurance, which covers the costs incurred in the event of a cancellation.'}
            </li>
            <li>
              {isDE
                ? 'Folgende Rücktrittskosten werden vom Vermieter erhoben:'
                : 'The following cancellation costs are charged by the landlord:'}
              <ul>
                <li>{isDE ? 'bis 90 Tage vor Mietbeginn: 25% des Mietpreises' : 'up to 90 days before rental start: 25% of rental price'}</li>
                <li>{isDE ? '89 bis 30 Tage vor Mietbeginn: 50% des Mietpreises' : '89 to 30 days before rental start: 50% of rental price'}</li>
                <li>{isDE ? 'weniger als 30 Tage vor Mietbeginn: 100% des Mietpreises' : 'less than 30 days before rental start: 100% of rental price'}</li>
              </ul>
            </li>
          </ol>

          <h2>{isDE ? 'Kaution' : 'Deposit'}</h2>
          <ol>
            <li>
              {isDE
                ? 'Der Vermieter ist berechtigt bei Schlüsselübergabe durch den Verwalter eine Kaution zu verlangen.'
                : 'The landlord is entitled to demand a deposit when the keys are handed over by the manager.'}
            </li>
            <li>
              {isDE
                ? 'Schäden am Mietobjekt, die vom Mieter zu vertreten sind, berechtigen den Verwalter, dafür entsprechende Kosten von der Kaution abzuziehen.'
                : 'Damage to the rental property for which the tenant is responsible entitles the manager to deduct the corresponding costs from the deposit.'}
            </li>
            <li>
              {isDE
                ? 'Die Kaution wird nach Ende der Mietzeit wieder ausgezahlt oder mit den anfallenden Nebenkosten verrechnet.'
                : 'The deposit will be refunded at the end of the rental period or offset against the incidental costs incurred.'}
            </li>
          </ol>

          <h2>{isDE ? 'Pflichten des Mieters' : 'Tenant Obligations'}</h2>
          <ol>
            <li>
              {isDE
                ? 'Der Mieter hat das Mietobjekt einschließlich Grundstück samt Inventar pfleglich zu behandeln und darf es ausschließlich zu Wohnzwecken benutzen. Während Ihres Aufenthaltes ist im Winter der Parkplatz sowie der Zugang zum Haus selbst von Schnee und Eis frei zu halten.'
                : 'The tenant must treat the rental property including the grounds and inventory with care and may only use it for residential purposes. During your stay in winter, the parking lot and the access to the house must be kept free of snow and ice.'}
            </li>
            <li>
              {isDE
                ? 'Der Mieter verpflichtet sich, das gemietete Objekt aufgeräumt, besenrein und frei von Müll zu hinterlassen.'
                : 'The tenant undertakes to leave the rented property tidy, swept clean and free of rubbish.'}
            </li>
            <li>
              {isDE
                ? 'Das Mietobjekt darf nur mit der angegebenen Personenzahl belegt werden.'
                : 'The rental property may only be occupied with the specified number of persons.'}
            </li>
            <li>
              {isDE
                ? 'Das Mitbringen von Haustieren ist nur nach Absprache mit dem Vermieter erlaubt.'
                : 'Bringing pets is only allowed after consultation with the landlord.'}
            </li>
            <li>
              {isDE
                ? 'Bitte keinen Hunde-Kot im Haus und auf dem Grundstück hinterlassen.'
                : 'Please do not leave dog excrement in the house or on the property.'}
            </li>
            <li>
              {isDE
                ? 'Aus hygienischen Gründen sollen sich die Haustiere nicht in den Schlafräumen aufhalten.'
                : 'For hygienic reasons, pets should not stay in the bedrooms.'}
            </li>
            <li>
              {isDE
                ? 'Bettwäsche und Handtücher müssen vom Mieter mitgebracht werden. Eine Benutzung der Betten ist ohne Bettwäsche nicht erlaubt.'
                : 'Bed linen and towels must be brought by the tenant. Use of the beds without bed linen is not permitted.'}
            </li>
          </ol>

          <h2>{isDE ? 'Pflichten des Vermieters' : 'Landlord Obligations'}</h2>
          <ol>
            <li>
              {isDE
                ? 'Der Vermieter verpflichtet sich, das Mietobjekt zum vereinbarten Mietzeitraum bereitzustellen und alle gemachten Angaben einzuhalten.'
                : 'The landlord undertakes to provide the rental property for the agreed rental period and to comply with all information provided.'}
            </li>
            <li>
              {isDE
                ? 'Änderungen von Ausstattung und Einrichtung bleiben dem Vermieter vorbehalten und begründen keine Ansprüche des Mieters.'
                : 'Changes to equipment and furnishings are reserved by the landlord and do not give rise to any claims by the tenant.'}
            </li>
            <li>
              {isDE
                ? 'Der Verwalter ist während Ihres Aufenthaltes nicht verpflichtet, das Grundstück von Schnee und Eis freizuhalten.'
                : 'The manager is not obliged to keep the property free of snow and ice during your stay.'}
            </li>
          </ol>

          <h2>{isDE ? 'Gerichtsstand' : 'Jurisdiction'}</h2>
          <p>
            {isDE
              ? 'Für alle Rechtsstreitigkeiten ist das Wohnsitzgericht des Vermieters zuständig. Alle Streitigkeiten aus diesem Vertragsverhältnis unterliegen im Übrigen dem Recht der Bundesrepublik Deutschland.'
              : 'The court of the landlord\'s domicile has jurisdiction for all legal disputes. All disputes arising from this contractual relationship are otherwise subject to the law of the Federal Republic of Germany.'}
          </p>
        </div>
      </div>
    </div>
  );
}
