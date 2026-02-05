/**
 * Footer Component - Enterprise Grade
 */

import { Link } from 'react-router-dom';
import { Github, Linkedin } from 'lucide-react';
import './Footer.css';

const navLinks = [
    { name: 'Dashboard', href: '/' },
    { name: 'Practice', href: '/practice' },
    { name: 'Progress', href: '/progress' },
    { name: 'Phonemes', href: '/phonemes' },
    { name: 'About Us', href: '/about' },
];

export default function Footer() {
    return (
        <footer className="landing-footer-enterprise">
            <div className="footer-container-enterprise">
                <div className="footer-brand-enterprise">
                    <div className="footer-logo-enterprise">
                        <img
                            src="/icon.png"
                            alt="Pronunex Logo"
                            className="footer-logo-img-enterprise"
                        />
                        <span className="footer-logo-text-enterprise">Pronunex</span>
                    </div>
                    <p className="footer-tagline-enterprise">
                        AI-Powered Speech Therapy for English Pronunciation Mastery
                    </p>
                </div>

                <nav className="footer-nav-enterprise" aria-label="Footer navigation">
                    <h4 className="footer-nav-title-enterprise">Quick Links</h4>
                    <ul className="footer-nav-list-enterprise">
                        {navLinks.map((link) => (
                            <li key={link.name}>
                                <Link to={link.href} className="footer-nav-link-enterprise">
                                    {link.name}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </nav>

                <div className="footer-social-enterprise">
                    <h4 className="footer-nav-title-enterprise">Connect</h4>
                    <div className="footer-social-links-enterprise">
                        <a
                            href="https://github.com/infosys-springboard-vinternship"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="footer-social-link-enterprise"
                            aria-label="Visit our GitHub"
                        >
                            <Github aria-hidden="true" />
                        </a>
                        <a
                            href="https://www.linkedin.com/in/abhishekmaurya9118/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="footer-social-link-enterprise"
                            aria-label="Connect on LinkedIn"
                        >
                            <Linkedin aria-hidden="true" />
                        </a>
                    </div>
                </div>
            </div>

            <div className="footer-bottom-enterprise">
                <p className="footer-copyright-enterprise">
                    &copy; {new Date().getFullYear()} Pronunex. All rights reserved.
                </p>
            </div>
        </footer>
    );
}
