import { useState } from 'react';
import './FindHelp.css';

const SPECIALTIES = [
  { value: 'all',           label: 'All mental health' },
  { value: 'counselor',     label: 'Counselors' },
  { value: 'psychologist',  label: 'Psychologists' },
  { value: 'psychiatrist',  label: 'Psychiatrists' },
  { value: 'social_worker', label: 'Social workers' },
];

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY','DC',
];

function ProviderCard({ provider }) {
  const addr = provider.address;
  const addressLine = [addr.line1, addr.city, addr.state, addr.zip].filter(Boolean).join(', ');

  return (
    <div className="provider-card">
      <div className="provider-card__header">
        <h3 className="provider-card__name">{provider.name}</h3>
        <span className="provider-card__badge">{provider.type === 'organization' ? 'Facility' : 'Individual'}</span>
      </div>
      <p className="provider-card__specialty">{provider.specialty}</p>
      {addressLine && <p className="provider-card__address">{addressLine}</p>}
      {provider.phone && (
        <a href={`tel:${provider.phone}`} className="provider-card__phone">
          {provider.phone.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3')}
        </a>
      )}
    </div>
  );
}

function CrisisBanner() {
  return (
    <div className="crisis-banner">
      <p className="crisis-banner__text">
        If you're in crisis right now, you deserve immediate support:
      </p>
      <div className="crisis-banner__links">
        <a href="tel:988" className="crisis-banner__link crisis-banner__link--primary">
          Call/text 988
        </a>
        <a href="sms:741741?body=HOME" className="crisis-banner__link">
          Text HOME to 741741
        </a>
      </div>
    </div>
  );
}

export default function FindHelp() {
  const [city, setCity] = useState('');
  const [state, setState] = useState('IN');
  const [specialty, setSpecialty] = useState('all');
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async () => {
    if (!city.trim()) return;
    setLoading(true);
    setError('');
    setSearched(true);

    try {
      const params = new URLSearchParams({
        city: city.trim(),
        state,
        limit: '15',
      });
      if (specialty !== 'all') params.set('specialty', specialty);

      const res = await fetch(`/api/therapists/search?${params}`);
      if (!res.ok) throw new Error(`Search failed: ${res.status}`);

      const data = await res.json();
      setProviders(data.providers || []);
    } catch (err) {
      console.error('Therapist search error:', err);
      setError(err.message || 'Search failed. Please try again.');
      setProviders([]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSearch();
  };

  return (
    <div className="findhelp-screen">
      <div className="findhelp-header">
        <h1 className="findhelp-title">Find help</h1>
        <p className="findhelp-sub">
          You deserve support from a real person. Find licensed mental health providers near you.
        </p>
      </div>

      <CrisisBanner />

      {/* Search form */}
      <div className="findhelp-form">
        <div className="findhelp-row">
          <div className="findhelp-field findhelp-field--city">
            <label className="findhelp-label">City</label>
            <input
              type="text"
              className="findhelp-input"
              placeholder="e.g. Bloomington"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>
          <div className="findhelp-field findhelp-field--state">
            <label className="findhelp-label">State</label>
            <select
              className="findhelp-select"
              value={state}
              onChange={(e) => setState(e.target.value)}
            >
              {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <div className="findhelp-row">
          <div className="findhelp-field findhelp-field--specialty">
            <label className="findhelp-label">Specialty</label>
            <select
              className="findhelp-select"
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
            >
              {SPECIALTIES.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
          <button
            className="findhelp-btn"
            onClick={handleSearch}
            disabled={!city.trim() || loading}
          >
            {loading ? 'Searching…' : 'Search'}
          </button>
        </div>
      </div>

      {/* Results */}
      {error && <div className="findhelp-error">{error}</div>}

      {searched && !loading && providers.length === 0 && !error && (
        <div className="findhelp-empty">
          <p className="findhelp-empty__head">No providers found in {city}, {state}</p>
          <p className="findhelp-empty__body">
            Try a nearby city, broaden the specialty filter, or search directly on{' '}
            <a
              href={`https://findtreatment.gov/locator?sAddr=${encodeURIComponent(city)}%2C+${state}&sType=MH`}
              target="_blank"
              rel="noopener noreferrer"
              className="findhelp-link"
            >
              FindTreatment.gov
            </a>
          </p>
        </div>
      )}

      {providers.length > 0 && (
        <div className="findhelp-results">
          <p className="findhelp-results__count">
            {providers.length} provider{providers.length !== 1 ? 's' : ''} found in {city}, {state}
          </p>
          <div className="findhelp-results__list">
            {providers.map((p, i) => <ProviderCard key={p.npi || i} provider={p} />)}
          </div>
          <p className="findhelp-disclaimer">
            Source: NPPES NPI Registry (CMS.gov). This is a directory of licensed providers, not a recommendation.
            Please verify availability and insurance coverage directly.
          </p>
        </div>
      )}

      {/* External links */}
      <div className="findhelp-external">
        <h3 className="findhelp-external__title">More resources</h3>
        <a
          href="https://findtreatment.gov"
          target="_blank"
          rel="noopener noreferrer"
          className="findhelp-external__link"
        >
          <strong>SAMHSA Treatment Locator</strong>
          <span>Search all behavioral health facilities nationwide</span>
        </a>
        <a
          href="https://www.psychologytoday.com/us/therapists"
          target="_blank"
          rel="noopener noreferrer"
          className="findhelp-external__link"
        >
          <strong>Psychology Today Directory</strong>
          <span>Filter by issue, insurance, gender, and more</span>
        </a>
        <a
          href="https://healthcenter.indiana.edu/counseling/"
          target="_blank"
          rel="noopener noreferrer"
          className="findhelp-external__link"
        >
          <strong>IU Counseling Services</strong>
          <span>Free for IU students — call 812-855-5711</span>
        </a>
      </div>
    </div>
  );
}
