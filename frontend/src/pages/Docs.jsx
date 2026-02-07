import React, { useState, useEffect, useRef, useMemo } from 'react';
import { SITE_DATA } from '../config/globalConfig';
import {
  Book, Search, Menu, X, ChevronDown,
  Mic, Server, Cpu, MessageSquare, Monitor,
  FileText, Rocket, HelpCircle, AlertCircle, Settings
} from 'lucide-react';
import './Docs.css';

// Icon mapping for each section
const sectionIcons = {
  'introduction': Book,
  'getting-started': Rocket,
  'how-to-use': Settings,
  'system-flow': Cpu,
  'processing-logic': Server,
  'dashboard-guide': Monitor,
  'common-issues': AlertCircle,
  'faqs': HelpCircle
};

// Parse markdown-like content into JSX
const parseContent = (content) => {
  if (!content) return null;

  const lines = content.split('\n').map(line => line.trim()).filter(Boolean);
  const elements = [];
  let listItems = [];
  let listType = null;

  const flushList = () => {
    if (listItems.length > 0) {
      if (listType === 'ol') {
        elements.push(
          <ol key={elements.length}>
            {listItems.map((item, idx) => <li key={idx}>{item}</li>)}
          </ol>
        );
      } else {
        elements.push(
          <ul key={elements.length}>
            {listItems.map((item, idx) => <li key={idx}>{item}</li>)}
          </ul>
        );
      }
      listItems = [];
      listType = null;
    }
  };

  lines.forEach((line, index) => {
    // Match numbered list: "1. text" or "1) text"
    const orderedMatch = line.match(/^\d+[\.\)]\s*(.+)/);
    // Match unordered list: "- text" or "* text"
    const unorderedMatch = line.match(/^[-\*]\s+(.+)/);

    if (orderedMatch) {
      if (listType !== 'ol') flushList();
      listType = 'ol';
      listItems.push(parseBold(orderedMatch[1]));
    } else if (unorderedMatch) {
      if (listType !== 'ul') flushList();
      listType = 'ul';
      listItems.push(parseBold(unorderedMatch[1]));
    } else {
      flushList();
      // Check for Q&A format
      const qaMatch = line.match(/^\*\*Q:\s*(.+?)\*\*$/);
      if (qaMatch) {
        elements.push(
          <p key={index} style={{ marginTop: '1.5rem' }}>
            <strong>Q: {qaMatch[1]}</strong>
          </p>
        );
      } else {
        elements.push(<p key={index}>{parseBold(line)}</p>);
      }
    }
  });

  flushList();
  return elements;
};

// Parse **bold** syntax
const parseBold = (text) => {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
};

// Flow Diagram Component
const FlowDiagram = () => {
  const flowSteps = [
    { icon: Mic, label: 'User Speech' },
    { icon: Mic, label: 'Audio Capture', arrow: true },
    { icon: Server, label: 'Backend API', arrow: true },
    {
      parallel: [
        { icon: FileText, label: 'Speech-to-Text' },
        { icon: Cpu, label: 'Alignment & Scoring' }
      ],
      arrow: true
    },
    { icon: MessageSquare, label: 'Feedback Response', arrow: true },
    { icon: Monitor, label: 'UI Display', arrow: true }
  ];

  return (
    <div className="docs-flow-diagram">
      {flowSteps.map((step, index) => (
        <React.Fragment key={index}>
          {step.arrow && index > 0 && (
            <div className="docs-flow-arrow">
              <ChevronDown size={24} />
            </div>
          )}
          {step.parallel ? (
            <div className="docs-flow-parallel">
              {step.parallel.map((pStep, pIndex) => (
                <React.Fragment key={pIndex}>
                  <div className="docs-flow-node-secondary">
                    <pStep.icon size={16} style={{ marginRight: '0.5rem', display: 'inline' }} />
                    {pStep.label}
                  </div>
                  {pIndex < step.parallel.length - 1 && (
                    <span style={{ color: 'var(--color-primary-400)', fontWeight: 'bold' }}>→</span>
                  )}
                </React.Fragment>
              ))}
            </div>
          ) : (
            <div className="docs-flow-node">
              <step.icon className="docs-flow-node-icon" size={20} />
              <span>{step.label}</span>
            </div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

const Docs = () => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSection, setActiveSection] = useState(SITE_DATA.docs.sections[0]?.id);
  const sectionRefs = useRef({});

  // Filter sections based on search
  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return SITE_DATA.docs.sections;
    const query = searchQuery.toLowerCase();
    return SITE_DATA.docs.sections.filter(
      section =>
        section.title.toLowerCase().includes(query) ||
        section.content.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  // Intersection Observer for active section tracking
  useEffect(() => {
    const observerOptions = {
      root: null,
      rootMargin: '-100px 0px -60% 0px',
      threshold: 0
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          setActiveSection(entry.target.id);
        }
      });
    }, observerOptions);

    SITE_DATA.docs.sections.forEach(section => {
      const el = sectionRefs.current[section.id];
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const scrollToSection = (sectionId) => {
    const el = sectionRefs.current[sectionId];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setSidebarOpen(false);
    }
  };

  return (
    <div className="docs-container">
      {/* Mobile Overlay */}
      <div
        className={`docs-overlay ${isSidebarOpen ? 'visible' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Sidebar */}
      <aside className={`docs-sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="docs-sidebar-header">
          <Book size={24} color="var(--color-primary-500)" />
          <h2 className="docs-sidebar-title">Documentation</h2>
        </div>

        {/* Search */}
        <div className="docs-search">
          <div className="docs-search-wrapper">
            <Search size={16} className="docs-search-icon" />
            <input
              type="text"
              placeholder="Search docs..."
              className="docs-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Navigation */}
        <nav className="docs-nav">
          {filteredSections.map((section) => {
            const Icon = sectionIcons[section.id] || FileText;
            return (
              <button
                key={section.id}
                className={`docs-nav-item ${activeSection === section.id ? 'active' : ''}`}
                onClick={() => scrollToSection(section.id)}
              >
                <Icon className="docs-nav-item-icon" size={18} />
                <span>{section.title}</span>
              </button>
            );
          })}
          {filteredSections.length === 0 && (
            <div style={{ padding: '1rem 1.5rem', color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>
              No results found
            </div>
          )}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="docs-main">
        <div className="docs-content-wrapper">
          {SITE_DATA.docs.sections.map((section) => {
            const Icon = sectionIcons[section.id] || FileText;
            return (
              <section
                key={section.id}
                id={section.id}
                ref={(el) => (sectionRefs.current[section.id] = el)}
                className="docs-section"
              >
                <h2 className="docs-section-title">
                  <Icon className="docs-section-title-icon" size={28} />
                  {section.title}
                </h2>
                <div className="docs-prose">
                  {section.id === 'system-flow' ? (
                    <>
                      <p>
                        The diagram below illustrates the complete data flow from user speech input
                        to the final feedback displayed on the UI.
                      </p>
                      <FlowDiagram />
                    </>
                  ) : (
                    parseContent(section.content)
                  )}
                </div>
              </section>
            );
          })}
        </div>
      </main>

      {/* Mobile Toggle */}
      <button
        className="docs-mobile-toggle"
        onClick={() => setSidebarOpen(!isSidebarOpen)}
        aria-label="Toggle navigation"
      >
        {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
      </button>
    </div>
  );
};

export default Docs;