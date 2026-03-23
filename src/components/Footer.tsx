import { useState } from 'react';
import packageJson from '../../package.json';

const Footer = () => {
  const issuesUrl = 'https://github.com/Sportvereniging-H-G-V/presentielijst-generator/issues';
  const [cleared, setCleared] = useState(false);

  const handleClearData = () => {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('trials:') || key.startsWith('presence:') || key.startsWith('plist:'))) {
        keys.push(key);
      }
    }
    keys.forEach((key) => localStorage.removeItem(key));
    setCleared(true);
    setTimeout(() => setCleared(false), 3000);
  };

  return (
    <footer className="py-4 text-center text-sm text-gray-500">
      <div className="space-y-1">
        <div className="text-xs text-gray-400">
          Versie {packageJson.version}
        </div>
        <div className="text-xs text-gray-400">
          Gegevens (namen, telefoonnummers, aanwezigheid) worden alleen lokaal in uw browser opgeslagen en nooit naar een server verzonden.{' '}
          <button
            type="button"
            onClick={handleClearData}
            className="text-blue-600 hover:text-blue-800 underline cursor-pointer"
          >
            {cleared ? 'Gegevens verwijderd.' : 'Verwijder alle opgeslagen gegevens'}
          </button>
        </div>
        <div className="text-xs text-gray-400">
          Bug melden of Feature aanvragen:{' '}
          <a
            href={issuesUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 underline"
          >
            GitHub
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
