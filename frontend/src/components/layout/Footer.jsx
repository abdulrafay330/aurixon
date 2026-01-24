import { Link } from 'react-router-dom';

/**
 * Footer Component
 * AURIXON footer with brand colors
 */
const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-midnight-navy text-white mt-auto">
      <div className="container-custom py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Section */}
          <div className="col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <img 
                src="/aurixon_logo.png" 
                alt="AURIXON" 
                className="h-8 w-auto"
              />
              <span className="text-xl font-heading font-bold">
                AURIX<span className="text-growth-green">ON</span>
              </span>
            </div>
            <p className="text-sm text-compliance-blue">
              AI-powered CSRD compliance made simple
            </p>
          </div>

          {/* Product Links */}
          <div>
            <h3 className="text-sm font-semibold mb-4">Product</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/features" className="text-gray-300 hover:text-compliance-blue transition-colors">
                  Features
                </Link>
              </li>
              <li>
                <Link to="/pricing" className="text-gray-300 hover:text-compliance-blue transition-colors">
                  Pricing
                </Link>
              </li>
              <li>
                <Link to="/demo" className="text-gray-300 hover:text-compliance-blue transition-colors">
                  Request Demo
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources Links */}
          <div>
            <h3 className="text-sm font-semibold mb-4">Resources</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/docs" className="text-gray-300 hover:text-compliance-blue transition-colors">
                  Documentation
                </Link>
              </li>
              <li>
                <Link to="/help" className="text-gray-300 hover:text-compliance-blue transition-colors">
                  Help Center
                </Link>
              </li>
              <li>
                <Link to="/blog" className="text-gray-300 hover:text-compliance-blue transition-colors">
                  Blog
                </Link>
              </li>
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h3 className="text-sm font-semibold mb-4">Company</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/about" className="text-gray-300 hover:text-compliance-blue transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-gray-300 hover:text-compliance-blue transition-colors">
                  Contact
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="text-gray-300 hover:text-compliance-blue transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/terms" className="text-gray-300 hover:text-compliance-blue transition-colors">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-white/10 mt-8 pt-6 text-sm text-gray-400 text-center">
          <p>© {currentYear} AURIXON. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
