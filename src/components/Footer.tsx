import packageJson from '../../package.json';

const Footer = () => {
  const issuesUrl = 'https://github.com/Sportvereniging-H-G-V/presentielijst-generator/issues';
  
  return (
    <footer className="py-4 text-center text-sm text-gray-500">
      <div className="space-y-1">
        <div className="text-xs text-gray-400">
          Versie {packageJson.version}
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
