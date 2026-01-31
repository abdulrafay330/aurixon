import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Menu, X } from 'lucide-react';

const LandingPage = () => {
  const { isAuthenticated } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-midnight-navy flex flex-col">
      {/* Navbar */}
      <nav className="bg-white/5 backdrop-blur-md border-b border-cyan-mist/20 fixed w-full z-50">
        <div className="container-custom mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Logo */}
            <div className="flex-shrink-0 flex items-center">
              <Link to="/" className="flex items-center space-x-2">
                <div className="w-10 h-10 bg-gradient-to-br from-cyan-mist to-success rounded-lg flex items-center justify-center">
                  <span className="text-midnight-navy font-bold text-xl">A</span>
                </div>
                <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-cyan-mist">
                  AURIXON
                </span>
              </Link>
            </div>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-gray-300 hover:text-white transition-colors">Features</a>
              <a href="#about" className="text-gray-300 hover:text-white transition-colors">About Us</a>
              <a href="#how-it-works" className="text-gray-300 hover:text-white transition-colors">How it Works</a>
              
              {isAuthenticated ? (
                <Link to="/dashboard" className="btn-primary px-6 py-2 rounded-full">
                  Go to Dashboard
                </Link>
              ) : (
                <div className="flex items-center space-x-4">
                  <Link to="/login" className="text-cyan-mist hover:text-white font-medium transition-colors">
                    Log In
                  </Link>
                  <Link to="/register" className="btn-primary px-6 py-2 rounded-full transform hover:scale-105 transition-transform">
                    Sign Up
                  </Link>
                </div>
              )}
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden flex items-center">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="text-gray-300 hover:text-white focus:outline-none"
              >
                {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-midnight-navy border-b border-cyan-mist/20">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
              <a href="#features" className="block px-3 py-2 text-base font-medium text-gray-300 hover:text-white hover:bg-white/10 rounded-md">Features</a>
              <a href="#about" className="block px-3 py-2 text-base font-medium text-gray-300 hover:text-white hover:bg-white/10 rounded-md">About Us</a>
              <a href="#how-it-works" className="block px-3 py-2 text-base font-medium text-gray-300 hover:text-white hover:bg-white/10 rounded-md">How it Works</a>
              
              {isAuthenticated ? (
                <Link to="/dashboard" className="block w-full text-center mt-4 px-5 py-3 btn-primary rounded-md">
                  Dashboard
                </Link>
              ) : (
                <div className="mt-4 space-y-2">
                  <Link to="/login" className="block w-full text-center px-5 py-3 btn-secondary rounded-md">
                    Log In
                  </Link>
                  <Link to="/register" className="block w-full text-center px-5 py-3 btn-primary rounded-md">
                    Sign Up
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <div className="relative pt-32 pb-20 sm:pt-40 sm:pb-24 overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-0 -left-1/4 w-1/2 h-1/2 bg-cyan-mist/10 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 -right-1/4 w-1/2 h-1/2 bg-growth-green/10 rounded-full blur-[120px]" />
        </div>
        
        <div className="relative container-custom mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-white/5 border border-cyan-mist/20 mb-8 backdrop-blur-sm animate-fade-in-up">
            <span className="w-2 h-2 rounded-full bg-success mr-2 animate-pulse"></span>
            <span className="text-sm text-cyan-mist font-medium">CSRD Compliant Reporting</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-8 animate-fade-in-up delay-100">
            Carbon Footprint <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-mist to-success">
              Calculator for SMEs
            </span>
          </h1>
          
          <p className="mt-4 max-w-2xl mx-auto text-xl text-gray-400 mb-10 animate-fade-in-up delay-200 text-balance">
            Automate your ESG reporting with European Environment Agency data accuracy. 
            Simplified for Small and Medium Enterprises.
          </p>
          
          <div className="flex flex-col sm:flex-row justify-center gap-4 animate-fade-in-up delay-300">
            {isAuthenticated ? (
               <Link to="/dashboard" className="btn-primary text-lg px-8 py-4 rounded-full shadow-lg shadow-cyan-mist/20 hover:shadow-cyan-mist/40 transition-all">
                Go to Dashboard
              </Link>
            ) : (
              <>
                <Link to="/register" className="btn-primary text-lg px-8 py-4 rounded-full shadow-lg shadow-cyan-mist/20 hover:shadow-cyan-mist/40 transition-all">
                  Start Your Free Trial
                </Link>
                <Link to="/login" className="btn-secondary text-lg px-8 py-4 rounded-full">
                  Login to Account
                </Link> 
              </>
            )}
          </div>
        </div>
      </div>


      {/* Features Grid */}
      <div id="features" className="py-24 bg-white/5 relative">
        <div className="container-custom mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Why Choose Aurixon?</h2>
            <p className="text-gray-400 max-w-2xl mx-auto text-lg">
              Built specifically for European businesses to meet CSRD requirements with ease.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureCard 
              title="Automated Calculations"
              description="Simply enter your activity data. We use the latest EEA emission factors to calculate your CO2e automatically."
              icon="📊"
            />
            <FeatureCard 
              title="CSRD Compliant"
              description="Generated reports are aligned with the Corporate Sustainability Reporting Directive standards ready for audit."
              icon="✓"
            />
            <FeatureCard 
              title="Scope 1, 2 & 3"
              description="Comprehensive coverage of all emission scopes including supply chain calculation modules."
              icon="🌍"
            />
          </div>
        </div>
      </div>

      {/* About Us Section */}
      <div id="about" className="py-24 bg-midnight-navy-lighter border-t border-cyan-mist/10">
        <div className="container-custom mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl text-center">
          <h2 className="text-3xl font-bold mb-6 text-cyan-mist">About Us</h2>
          <p className="text-lg text-gray-300 mb-4">
            Aurixon is a climate-tech company on a mission to empower small and medium enterprises (SMEs) across Europe to take control of their carbon footprint. Our team brings together experts in sustainability, data science, and software engineering to deliver a platform that makes ESG and CSRD compliance simple, accurate, and affordable.
          </p>
          <p className="text-lg text-gray-300">
            We believe that every business, regardless of size, should have access to the tools and knowledge needed to measure, manage, and reduce their environmental impact. Aurixon is committed to transparency, innovation, and supporting the transition to a low-carbon economy.
          </p>
        </div>
      </div>

      {/* How it Works Section */}
      <div id="how-it-works" className="py-24 bg-white/5 border-t border-cyan-mist/10">
        <div className="container-custom mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl">
          <h2 className="text-3xl font-bold mb-10 text-success text-center">How it Works</h2>
          <div className="grid md:grid-cols-3 gap-10">
            <div className="bg-midnight-navy-lighter rounded-xl p-8 shadow-lg flex flex-col items-center">
              <div className="w-14 h-14 flex items-center justify-center rounded-full bg-cyan-mist/20 mb-4 text-3xl">📝</div>
              <h3 className="text-xl font-bold text-cyan-mist mb-2">1. Sign Up & Set Up</h3>
              <p className="text-gray-300">Create your free account, add your company details, and answer a few quick questions to define your reporting boundaries.</p>
            </div>
            <div className="bg-midnight-navy-lighter rounded-xl p-8 shadow-lg flex flex-col items-center">
              <div className="w-14 h-14 flex items-center justify-center rounded-full bg-success/20 mb-4 text-3xl">📥</div>
              <h3 className="text-xl font-bold text-success mb-2">2. Enter Activities</h3>
              <p className="text-gray-300">Log your business activities—energy use, travel, waste, and more. Our platform automatically matches the right emission factors for you.</p>
            </div>
            <div className="bg-midnight-navy-lighter rounded-xl p-8 shadow-lg flex flex-col items-center">
              <div className="w-14 h-14 flex items-center justify-center rounded-full bg-cyan-mist/20 mb-4 text-3xl">📊</div>
              <h3 className="text-xl font-bold text-cyan-mist mb-2">3. Get Reports</h3>
              <p className="text-gray-300">Instantly generate CSRD-compliant reports and actionable insights to help you reduce emissions and demonstrate compliance to stakeholders.</p>
            </div>
          </div>
        </div>
      </div>

      {/* About/Footer */}
      <footer className="bg-midnight-navy py-12 border-t border-white/10 mt-auto">
        <div className="container-custom mx-auto px-4 text-center text-gray-500">
          <div className="flex justify-center space-x-6 mb-8">
            <div className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center hover:bg-white/10 cursor-pointer transition-colors">
              <span className="sr-only">LinkedIn</span>
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
            </div>
            <div className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center hover:bg-white/10 cursor-pointer transition-colors">
              <span className="sr-only">Twitter</span>
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/></svg>
            </div>
          </div>
          <p>© 2026 Aurixon. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

const FeatureCard = ({ title, description, icon }) => (
  <div className="card hover:bg-white/10 transition-colors p-8">
    <div className="w-12 h-12 bg-gradient-to-br from-cyan-mist to-success rounded-lg flex items-center justify-center text-2xl mb-6 text-midnight-navy font-bold">
      {icon}
    </div>
    <h3 className="text-xl font-bold mb-3 text-white">{title}</h3>
    <p className="text-gray-400 leading-relaxed">{description}</p>
  </div>
);

export default LandingPage;
