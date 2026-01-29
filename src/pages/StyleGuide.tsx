/**
 * Style Guide Page
 * 
 * Interactive documentation of the HASHD semantic design system.
 * Displays all CSS classes with live examples.
 */

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Palette, Type, Square, MousePointer, AlertCircle,
  CheckCircle, XCircle, Info, Bell, Tag, Layout,
  Sparkles, Box, FormInput, ToggleLeft, ChevronRight,
  Copy, Check, X, Shield, Zap, Gift, Lock, Mail, ArrowLeft
} from 'lucide-react';

// Navigation sections
const sections = [
  { id: 'colors', label: 'Colors', icon: Palette },
  { id: 'typography', label: 'Typography', icon: Type },
  { id: 'buttons', label: 'Buttons', icon: MousePointer },
  { id: 'cards', label: 'Cards', icon: Square },
  { id: 'alerts', label: 'Alerts', icon: AlertCircle },
  { id: 'inputs', label: 'Inputs', icon: FormInput },
  { id: 'badges', label: 'Badges', icon: Tag },
  { id: 'modals', label: 'Modals', icon: Layout },
  { id: 'utilities', label: 'Utilities', icon: Sparkles },
];

// Code display component
const CodeBlock: React.FC<{ code: string; className?: string }> = ({ code, className = '' }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`relative group ${className}`}>
      <pre className="text-xs font-mono bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto border border-gray-700 shadow-lg">
        <code className="font-mono">{code}</code>
      </pre>
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 px-2 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded text-xs font-mono opacity-0 group-hover:opacity-100 transition-opacity border border-gray-600"
        title={copied ? 'Copied!' : 'Copy code'}
      >
        {copied ? (
          <span className="flex items-center gap-1">
            <Check className="w-3 h-3" /> Copied
          </span>
        ) : (
          <span className="flex items-center gap-1">
            <Copy className="w-3 h-3" /> Copy
          </span>
        )}
      </button>
    </div>
  );
};

// Example wrapper component
const Example: React.FC<{
  title: string;
  code: string;
  children: React.ReactNode;
  description?: string;
}> = ({ title, code, children, description }) => (
  <div className="mb-8">
    <h4 className="text-subtitle mb-2">{title}</h4>
    {description && <p className="text-muted mb-3">{description}</p>}
    <div className="card-bordered p-4 mb-2">
      {children}
    </div>
    <CodeBlock code={code} />
  </div>
);

export const StyleGuide: React.FC = () => {
  const [activeSection, setActiveSection] = useState('colors');
  const [showModal, setShowModal] = useState(false);
  const [toggleState, setToggleState] = useState(false);
  const [animationKey, setAnimationKey] = useState(0);

  const scrollToSection = (id: string) => {
    setActiveSection(id);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="min-h-screen bg-base">
      <div className="flex max-w-7xl mx-auto">
        {/* Sidebar Navigation */}
        <aside className="w-64 flex-shrink-0 bg-elevated border-r border-subtle p-6 sticky top-0 h-screen overflow-y-auto">
          <h1 className="text-title mb-6">Style Guide</h1>
          <nav className="space-y-1">
            {sections.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => scrollToSection(id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-left ${activeSection === id
                    ? 'bg-primary-100 text-neon-primary border border-primary-300'
                    : 'text-muted hover:bg-hover hover:text-secondary'
                  }`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-sm font-mono">{label}</span>
              </button>
            ))}
          </nav>

          <div className="mt-8 pt-6 border-t border-subtle">
            <p className="text-muted-sm mb-4">
              HASHD Design System v1.0
            </p>
            <Link
              to="/"
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-muted hover:bg-hover hover:text-primary transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm font-mono">Exit to App</span>
            </Link>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8 max-w-5xl">

          {/* Colors Section */}
          <section id="colors" className="mb-16 scroll-mt-8">
            <div className="section-header">
              <Palette className="w-5 h-5 text-neon-primary" />
              <h2 className="text-title">Colors</h2>
            </div>

            <h3 className="text-subtitle mb-4">Brand Colors (Primary to Quaternary)</h3>
            <div className="grid grid-cols-4 gap-4 mb-8">
              <div className="space-y-2">
                <div className="h-20 rounded-lg" style={{ background: 'var(--color-primary)' }} />
                <p className="text-label">Primary</p>
                <p className="text-muted">Cyan #00ffff</p>
                <p className="text-muted-sm">CTAs, links, main brand</p>
              </div>
              <div className="space-y-2">
                <div className="h-20 rounded-lg" style={{ background: 'var(--color-secondary)' }} />
                <p className="text-label">Secondary</p>
                <p className="text-muted">Magenta #ff00ff</p>
                <p className="text-muted-sm">Settings, accents</p>
              </div>
              <div className="space-y-2">
                <div className="h-20 rounded-lg" style={{ background: 'var(--color-tertiary)' }} />
                <p className="text-label">Tertiary</p>
                <p className="text-muted">Green #00ff41</p>
                <p className="text-muted-sm">Success, verified</p>
              </div>
              <div className="space-y-2">
                <div className="h-20 rounded-lg" style={{ background: 'var(--color-quaternary)' }} />
                <p className="text-label">Quaternary</p>
                <p className="text-muted">Orange #f97316</p>
                <p className="text-muted-sm">Special, premium</p>
              </div>
            </div>

            <h3 className="text-subtitle mb-4">Semantic Colors</h3>
            <div className="grid grid-cols-4 gap-4 mb-8">
              <div className="space-y-2">
                <div className="h-16 rounded-lg flex items-center justify-center" style={{ background: 'var(--color-success-bg)', border: '1px solid var(--color-success-border)' }}>
                  <span className="text-success font-bold">Success</span>
                </div>
                <p className="text-muted-sm">Maps to Tertiary</p>
              </div>
              <div className="space-y-2">
                <div className="h-16 rounded-lg flex items-center justify-center" style={{ background: 'var(--color-warning-bg)', border: '1px solid var(--color-warning-border)' }}>
                  <span className="text-warning font-bold">Warning</span>
                </div>
                <p className="text-muted-sm">Yellow #f59e0b</p>
              </div>
              <div className="space-y-2">
                <div className="h-16 rounded-lg flex items-center justify-center" style={{ background: 'var(--color-error-bg)', border: '1px solid var(--color-error-border)' }}>
                  <span className="text-error font-bold">Error</span>
                </div>
                <p className="text-muted-sm">Red #ef4444</p>
              </div>
              <div className="space-y-2">
                <div className="h-16 rounded-lg flex items-center justify-center" style={{ background: 'var(--color-info-bg)', border: '1px solid var(--color-info-border)' }}>
                  <span className="text-info font-bold">Info</span>
                </div>
                <p className="text-muted-sm">Maps to Primary</p>
              </div>
            </div>

            <h3 className="text-subtitle mb-4">Background Colors</h3>
            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-2">
                <div className="h-16 rounded-lg bg-base border border-subtle" />
                <p className="text-muted">bg-base</p>
              </div>
              <div className="space-y-2">
                <div className="h-16 rounded-lg bg-elevated border border-subtle" />
                <p className="text-muted">bg-elevated</p>
              </div>
              <div className="space-y-2">
                <div className="h-16 rounded-lg bg-surface border border-subtle" />
                <p className="text-muted">bg-surface</p>
              </div>
              <div className="space-y-2">
                <div className="h-16 rounded-lg bg-card border border-subtle" />
                <p className="text-muted">bg-card</p>
              </div>
            </div>
          </section>

          {/* Typography Section */}
          <section id="typography" className="mb-16 scroll-mt-8">
            <div className="section-header">
              <Type className="w-5 h-5 text-neon-primary" />
              <h2 className="text-title">Typography</h2>
            </div>

            <Example
              title="Titles"
              code={`<h1 class="text-title-xl">Extra Large Title</h1>
<h1 class="text-title-lg">Large Title</h1>
<h1 class="text-title">Section Title</h1>`}
            >
              <div className="space-y-4">
                <h1 className="text-title-xl">Extra Large Title</h1>
                <h1 className="text-title-lg">Large Title</h1>
                <h1 className="text-title">Section Title</h1>
              </div>
            </Example>

            <Example
              title="Subtitles (Color Variants)"
              code={`<h2 class="text-subtitle">Primary Subtitle</h2>
<h2 class="text-subtitle-secondary">Secondary Subtitle</h2>
<h2 class="text-subtitle-tertiary">Tertiary Subtitle</h2>
<h2 class="text-subtitle-quaternary">Quaternary Subtitle</h2>`}
            >
              <div className="space-y-3">
                <h2 className="text-subtitle">Primary Subtitle</h2>
                <h2 className="text-subtitle-secondary">Secondary Subtitle</h2>
                <h2 className="text-subtitle-tertiary">Tertiary Subtitle</h2>
                <h2 className="text-subtitle-quaternary">Quaternary Subtitle</h2>
              </div>
            </Example>

            <Example
              title="Body Text"
              code={`<p class="text-body-lg">Large body text for important content.</p>
<p class="text-body">Standard body text for descriptions and content.</p>
<p class="text-muted">Muted helper text.</p>
<p class="text-muted-sm">Small muted text.</p>`}
            >
              <div className="space-y-2">
                <p className="text-body-lg">Large body text for important content.</p>
                <p className="text-body">Standard body text for descriptions and content.</p>
                <p className="text-muted">Muted helper text.</p>
                <p className="text-muted-sm">Small muted text.</p>
              </div>
            </Example>

            <Example
              title="Labels"
              code={`<label class="text-label">Standard Label</label>
<label class="text-label-bar">Label with Bar Indicator</label>`}
            >
              <div className="space-y-4">
                <label className="text-label">Standard Label</label>
                <label className="text-label-bar">Label with Bar Indicator</label>
              </div>
            </Example>

            <Example
              title="Data Display"
              code={`<span class="text-data">0x1234567890abcdef1234567890abcdef12345678</span>
<span class="text-data-highlight">Important Value: 1,234.56 ETH</span>`}
            >
              <div className="space-y-2">
                <div><span className="text-data">0x1234567890abcdef1234567890abcdef12345678</span></div>
                <div><span className="text-data-highlight">Important Value: 1,234.56 ETH</span></div>
              </div>
            </Example>

            <Example
              title="Neon Text (with Glow)"
              code={`<span class="text-neon-primary">Glowing Cyan</span>
<span class="text-neon-secondary">Glowing Magenta</span>
<span class="text-neon-tertiary">Glowing Green</span>
<span class="text-neon-quaternary">Glowing Orange</span>`}
            >
              <div className="flex gap-6">
                <span className="text-neon-primary font-bold">Glowing Cyan</span>
                <span className="text-neon-secondary font-bold">Glowing Magenta</span>
                <span className="text-neon-tertiary font-bold">Glowing Green</span>
                <span className="text-neon-quaternary font-bold">Glowing Orange</span>
              </div>
            </Example>

            <Example
              title="Section Headers"
              code={`<div class="section-header">
  <Icon />
  <span class="text-subtitle">Section Title</span>
</div>`}
            >
              <div className="space-y-4">
                <div className="section-header">
                  <Shield className="w-5 h-5 text-neon-primary" />
                  <span className="text-subtitle">Primary Section</span>
                </div>
                <div className="section-header-secondary">
                  <Zap className="w-5 h-5" style={{ color: 'var(--color-secondary)' }} />
                  <span className="text-subtitle-secondary">Secondary Section</span>
                </div>
                <div className="section-header-tertiary">
                  <CheckCircle className="w-5 h-5" style={{ color: 'var(--color-tertiary)' }} />
                  <span className="text-subtitle-tertiary">Tertiary Section</span>
                </div>
              </div>
            </Example>
          </section>

          {/* Buttons Section */}
          <section id="buttons" className="mb-16 scroll-mt-8">
            <div className="section-header">
              <MousePointer className="w-5 h-5 text-neon-primary" />
              <h2 className="text-title">Buttons</h2>
            </div>

            <Example
              title="Primary Buttons"
              code={`<button class="btn btn-primary">Primary</button>
<button class="btn btn-primary-solid">Primary Solid</button>`}
            >
              <div className="flex gap-4">
                <button className="btn btn-primary">Primary</button>
                <button className="btn btn-primary-solid">Primary Solid</button>
              </div>
            </Example>

            <Example
              title="Color Variants"
              code={`<button class="btn btn-primary">Primary</button>
<button class="btn btn-secondary">Secondary</button>
<button class="btn btn-tertiary">Tertiary</button>
<button class="btn btn-quaternary">Quaternary</button>`}
            >
              <div className="flex flex-wrap gap-4">
                <button className="btn btn-primary">Primary</button>
                <button className="btn btn-secondary">Secondary</button>
                <button className="btn btn-tertiary">Tertiary</button>
                <button className="btn btn-quaternary">Quaternary</button>
              </div>
            </Example>

            <Example
              title="Semantic Variants"
              code={`<button class="btn btn-danger">Danger</button>
<button class="btn btn-warning">Warning</button>
<button class="btn btn-ghost">Ghost</button>`}
            >
              <div className="flex gap-4">
                <button className="btn btn-danger">Danger</button>
                <button className="btn btn-warning">Warning</button>
                <button className="btn btn-ghost">Ghost</button>
              </div>
            </Example>

            <Example
              title="Cyber Button (Animated)"
              code={`<button class="btn btn-cyber">Cyber Button</button>`}
              description="Special animated button for high-impact CTAs"
            >
              <button className="btn btn-cyber">
                <Zap className="w-4 h-4" />
                Cyber Button
              </button>
            </Example>

            <Example
              title="Button Sizes"
              code={`<button class="btn btn-primary btn-sm">Small</button>
<button class="btn btn-primary">Default</button>
<button class="btn btn-primary btn-lg">Large</button>`}
            >
              <div className="flex items-center gap-4">
                <button className="btn btn-primary btn-sm">Small</button>
                <button className="btn btn-primary">Default</button>
                <button className="btn btn-primary btn-lg">Large</button>
              </div>
            </Example>

            <Example
              title="Full Width"
              code={`<button class="btn btn-primary btn-block">Full Width Button</button>`}
            >
              <button className="btn btn-primary btn-block">Full Width Button</button>
            </Example>

            <Example
              title="Icon Buttons"
              code={`<button class="btn-icon"><Icon /></button>
<button class="btn-icon btn-icon-secondary"><Icon /></button>
<button class="btn-icon btn-icon-tertiary"><Icon /></button>
<button class="btn-icon btn-icon-danger"><Icon /></button>`}
            >
              <div className="flex gap-4">
                <button className="btn-icon"><Mail className="w-4 h-4" /></button>
                <button className="btn-icon btn-icon-secondary"><Gift className="w-4 h-4" /></button>
                <button className="btn-icon btn-icon-tertiary"><Check className="w-4 h-4" /></button>
                <button className="btn-icon btn-icon-danger"><X className="w-4 h-4" /></button>
              </div>
            </Example>

            <Example
              title="Disabled State"
              code={`<button class="btn btn-primary" disabled>Disabled</button>`}
            >
              <div className="flex gap-4">
                <button className="btn btn-primary" disabled>Disabled Primary</button>
                <button className="btn btn-secondary" disabled>Disabled Secondary</button>
              </div>
            </Example>
          </section>

          {/* Cards Section */}
          <section id="cards" className="mb-16 scroll-mt-8">
            <div className="section-header">
              <Square className="w-5 h-5 text-neon-primary" />
              <h2 className="text-title">Cards</h2>
            </div>

            <Example
              title="Cards"
              code={`<div class="card">Default Card</div>
<div class="card-interactive">Interactive Card (hover me)</div>`}
            >
              <div className="grid grid-cols-2 gap-4">
                <div className="card">
                  <h4 className="text-subtitle mb-2">Default Card</h4>
                  <p className="text-body">Standard card with border</p>
                </div>
                <div className="card-interactive">
                  <h4 className="text-subtitle mb-2">Interactive Card</h4>
                  <p className="text-body">Hover for effect</p>
                </div>
              </div>
            </Example>

            <Example
              title="Feature Cards"
              code={`<div class="card-feature">Primary Feature</div>
<div class="card-feature-secondary">Secondary Feature</div>
<div class="card-feature-quaternary">Special Feature</div>`}
            >
              <div className="grid grid-cols-3 gap-4">
                <div className="card-feature">
                  <h4 className="text-subtitle mb-2">Primary Feature</h4>
                  <p className="text-body">Highlighted content</p>
                </div>
                <div className="card-feature-secondary">
                  <h4 className="text-subtitle-secondary mb-2">Secondary Feature</h4>
                  <p className="text-body">Secondary highlight</p>
                </div>
                <div className="card-feature-quaternary">
                  <h4 className="text-subtitle-quaternary mb-2">Special Feature</h4>
                  <p className="text-body">Premium content</p>
                </div>
              </div>
            </Example>

            <Example
              title="Stat Cards"
              code={`<div class="card-stat">
  <div class="card-stat-label"><Icon /> Label</div>
  <div class="card-stat-value">1,234</div>
</div>`}
            >
              <div className="grid grid-cols-4 gap-4">
                <div className="card-stat">
                  <div className="card-stat-label"><Zap className="w-4 h-4" /> Power</div>
                  <div className="card-stat-value">1,234</div>
                </div>
                <div className="card-stat">
                  <div className="card-stat-label"><Gift className="w-4 h-4" /> Rewards</div>
                  <div className="card-stat-value">56.78</div>
                </div>
                <div className="card-stat">
                  <div className="card-stat-label"><Shield className="w-4 h-4" /> Security</div>
                  <div className="card-stat-value">100%</div>
                </div>
                <div className="card-stat">
                  <div className="card-stat-label"><Mail className="w-4 h-4" /> Messages</div>
                  <div className="card-stat-value">42</div>
                </div>
              </div>
            </Example>

            <Example
              title="Data Rows"
              code={`<div class="data-row">
  <span class="data-row-label">Label</span>
  <span class="data-row-value">Value</span>
</div>`}
            >
              <div className="card">
                <div className="data-row">
                  <span className="data-row-label">Status</span>
                  <span className="data-row-value">Active</span>
                </div>
                <div className="divider" />
                <div className="data-row">
                  <span className="data-row-label">Balance</span>
                  <span className="data-row-value">1,234.56 ETH</span>
                </div>
                <div className="divider" />
                <div className="data-row">
                  <span className="data-row-label">Created</span>
                  <span className="data-row-value">Dec 9, 2025</span>
                </div>
              </div>
            </Example>
          </section>

          {/* Alerts Section */}
          <section id="alerts" className="mb-16 scroll-mt-8">
            <div className="section-header">
              <AlertCircle className="w-5 h-5 text-neon-primary" />
              <h2 className="text-title">Alerts</h2>
            </div>

            <Example
              title="Full Alerts (with Title)"
              code={`<div class="alert-info">
  <h4 class="alert-title"><Icon /> Info Title</h4>
  <p class="alert-text">Info message text</p>
</div>`}
            >
              <div className="space-y-4">
                <div className="alert-info">
                  <h4 className="alert-title"><Info className="w-4 h-4" /> Information</h4>
                  <p className="alert-text">This is an informational message. Use for tips, notes, and general information.</p>
                </div>
                <div className="alert-success">
                  <h4 className="alert-title"><CheckCircle className="w-4 h-4" /> Success</h4>
                  <p className="alert-text">Operation completed successfully. Your changes have been saved.</p>
                </div>
                <div className="alert-warning">
                  <h4 className="alert-title"><AlertCircle className="w-4 h-4" /> Warning</h4>
                  <p className="alert-text">Please review before proceeding. This action may have consequences.</p>
                </div>
                <div className="alert-error">
                  <h4 className="alert-title"><XCircle className="w-4 h-4" /> Error</h4>
                  <p className="alert-text">Something went wrong. Please try again or contact support.</p>
                </div>
                <div className="alert-special">
                  <h4 className="alert-title"><Sparkles className="w-4 h-4" /> Special</h4>
                  <p className="alert-text">Premium feature unlocked! You now have access to advanced options.</p>
                </div>
              </div>
            </Example>

            <Example
              title="Inline Alerts (Compact)"
              code={`<div class="alert-inline alert-inline-info">Info text</div>
<div class="alert-inline alert-inline-success">Success text</div>
<div class="alert-inline alert-inline-warning">Warning text</div>
<div class="alert-inline alert-inline-error">Error text</div>`}
            >
              <div className="space-y-3">
                <div className="alert-inline alert-inline-info">
                  <Info className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--color-primary)' }} />
                  <span>Tip: You can use keyboard shortcuts for faster navigation.</span>
                </div>
                <div className="alert-inline alert-inline-success">
                  <CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--color-tertiary)' }} />
                  <span>Your profile has been updated successfully.</span>
                </div>
                <div className="alert-inline alert-inline-warning">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--color-warning)' }} />
                  <span>Your session will expire in 5 minutes.</span>
                </div>
                <div className="alert-inline alert-inline-error">
                  <XCircle className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--color-error)' }} />
                  <span>Failed to save changes. Please try again.</span>
                </div>
              </div>
            </Example>
          </section>

          {/* Inputs Section */}
          <section id="inputs" className="mb-16 scroll-mt-8">
            <div className="section-header">
              <FormInput className="w-5 h-5 text-neon-primary" />
              <h2 className="text-title">Inputs</h2>
            </div>

            <Example
              title="Text Inputs"
              code={`<input class="input" placeholder="Standard input" />
<input class="input input-sm" placeholder="Small input" />
<input class="input input-lg" placeholder="Large input" />`}
            >
              <div className="space-y-4 max-w-md">
                <input className="input" placeholder="Standard input" />
                <input className="input input-sm" placeholder="Small input" />
                <input className="input input-lg" placeholder="Large input" />
              </div>
            </Example>

            <Example
              title="Input States"
              code={`<input class="input" placeholder="Default" />
<input class="input input-error" placeholder="Error state" />
<input class="input input-success" placeholder="Success state" />
<input class="input" disabled placeholder="Disabled" />`}
            >
              <div className="space-y-4 max-w-md">
                <input className="input" placeholder="Default state" />
                <input className="input input-error" placeholder="Error state" />
                <input className="input input-success" placeholder="Success state" />
                <input className="input" disabled placeholder="Disabled state" />
              </div>
            </Example>

            <Example
              title="Textarea"
              code={`<textarea class="textarea" placeholder="Enter message..."></textarea>`}
            >
              <textarea className="textarea max-w-md" placeholder="Enter your message here..." />
            </Example>

            <Example
              title="Select"
              code={`<select class="select">
  <option>Option 1</option>
  <option>Option 2</option>
</select>`}
            >
              <select className="select max-w-md">
                <option>Select an option...</option>
                <option>Option 1</option>
                <option>Option 2</option>
                <option>Option 3</option>
              </select>
            </Example>

            <Example
              title="Checkbox"
              code={`<label class="checkbox-wrapper">
  <input type="checkbox" class="checkbox" />
  <span class="checkbox-label">Label</span>
</label>`}
            >
              <div className="space-y-3">
                <label className="checkbox-wrapper">
                  <input type="checkbox" className="checkbox" defaultChecked />
                  <span className="checkbox-label">Remember me</span>
                </label>
                <label className="checkbox-wrapper">
                  <input type="checkbox" className="checkbox" />
                  <span className="checkbox-label">Subscribe to newsletter</span>
                </label>
              </div>
            </Example>

            <Example
              title="Toggle"
              code={`<button class="btn-toggle active">
  <span class="btn-toggle-knob"></span>
</button>`}
            >
              <div className="flex items-center gap-4">
                <button
                  className={`btn-toggle ${toggleState ? 'active' : ''}`}
                  onClick={() => setToggleState(!toggleState)}
                >
                  <span className="btn-toggle-knob" />
                </button>
                <span className="text-body">{toggleState ? 'Enabled' : 'Disabled'}</span>
              </div>
            </Example>
          </section>

          {/* Badges Section */}
          <section id="badges" className="mb-16 scroll-mt-8">
            <div className="section-header">
              <Tag className="w-5 h-5 text-neon-primary" />
              <h2 className="text-title">Badges</h2>
            </div>

            <Example
              title="Color Variants"
              code={`<span class="badge badge-primary">Primary</span>
<span class="badge badge-secondary">Secondary</span>
<span class="badge badge-tertiary">Tertiary</span>
<span class="badge badge-quaternary">Quaternary</span>`}
            >
              <div className="flex flex-wrap gap-3">
                <span className="badge badge-primary">Primary</span>
                <span className="badge badge-secondary">Secondary</span>
                <span className="badge badge-tertiary">Tertiary</span>
                <span className="badge badge-quaternary">Quaternary</span>
              </div>
            </Example>

            <Example
              title="Semantic Variants"
              code={`<span class="badge badge-success">Success</span>
<span class="badge badge-warning">Warning</span>
<span class="badge badge-error">Error</span>
<span class="badge badge-neutral">Neutral</span>`}
            >
              <div className="flex flex-wrap gap-3">
                <span className="badge badge-success">Success</span>
                <span className="badge badge-warning">Warning</span>
                <span className="badge badge-error">Error</span>
                <span className="badge badge-neutral">Neutral</span>
              </div>
            </Example>

            <Example
              title="Pill Badges"
              code={`<span class="badge badge-primary badge-pill">Pill Badge</span>`}
            >
              <div className="flex flex-wrap gap-3">
                <span className="badge badge-primary badge-pill">Primary Pill</span>
                <span className="badge badge-secondary badge-pill">Secondary Pill</span>
                <span className="badge badge-tertiary badge-pill">Tertiary Pill</span>
              </div>
            </Example>

            <Example
              title="Status Badges"
              code={`<span class="badge-status badge-status-verified">Verified</span>
<span class="badge-status badge-status-pending">Pending</span>
<span class="badge-status badge-status-invalid">Invalid</span>`}
            >
              <div className="flex flex-wrap gap-3">
                <span className="badge-status badge-status-verified">
                  <CheckCircle className="w-3 h-3" /> Verified
                </span>
                <span className="badge-status badge-status-pending">
                  <AlertCircle className="w-3 h-3" /> Pending
                </span>
                <span className="badge-status badge-status-invalid">
                  <XCircle className="w-3 h-3" /> Invalid
                </span>
              </div>
            </Example>

            <Example
              title="HashID Badge"
              code={`<span class="badge-hashid">HashID</span>`}
            >
              <span className="badge-hashid">HashID</span>
            </Example>

            <Example
              title="Dot Indicators"
              code={`<span class="badge-dot"></span>
<span class="badge-dot badge-dot-success"></span>
<span class="badge-dot badge-dot-warning"></span>
<span class="badge-dot badge-dot-error"></span>
<span class="badge-dot badge-dot-pulse"></span>`}
            >
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <span className="badge-dot" />
                  <span className="text-muted">Primary</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="badge-dot badge-dot-success" />
                  <span className="text-muted">Success</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="badge-dot badge-dot-warning" />
                  <span className="text-muted">Warning</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="badge-dot badge-dot-error" />
                  <span className="text-muted">Error</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="badge-dot badge-dot-pulse" />
                  <span className="text-muted">Pulsing</span>
                </div>
              </div>
            </Example>
          </section>

          {/* Modals Section */}
          <section id="modals" className="mb-16 scroll-mt-8">
            <div className="section-header">
              <Layout className="w-5 h-5 text-neon-primary" />
              <h2 className="text-title">Modals</h2>
            </div>

            <Example
              title="Modal Structure"
              code={`<div class="modal-overlay">
  <div class="modal modal-2xl">
    <div class="modal-header">
      <div class="modal-header-content">
        <div class="modal-icon"><Icon /></div>
        <h3 class="modal-title">Title</h3>
      </div>
      <button class="modal-close"><X /></button>
    </div>
    <div class="modal-body">Content</div>
    <div class="modal-footer">
      <button class="btn btn-danger">Cancel</button>
      <button class="btn btn-primary">Confirm</button>
    </div>
  </div>
</div>`}
              description="Click the button to see a live modal example"
            >
              <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                Open Modal
              </button>
            </Example>

            {/* Live Modal */}
            {showModal && (
              <div className="modal-overlay" onClick={() => setShowModal(false)}>
                <div className="modal modal-2xl" onClick={e => e.stopPropagation()}>
                  <div className="modal-header">
                    <div className="modal-header-content">
                      <div className="modal-icon">
                        <Shield className="w-6 h-6" />
                      </div>
                      <h3 className="modal-title">Example Modal</h3>
                    </div>
                    <button className="modal-close" onClick={() => setShowModal(false)}>
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="modal-body">
                    <p className="text-body mb-4">
                      This modal demonstrates the semantic modal classes matching the NeonModal component.
                    </p>
                    <div className="alert-info">
                      <h4 className="alert-title"><Info className="w-4 h-4" /> Modal Sizes</h4>
                      <p className="alert-text">
                        Available sizes: modal-sm, modal-md, modal-lg, modal-xl, modal-2xl, modal-3xl, modal-4xl
                      </p>
                    </div>
                  </div>
                  <div className="modal-footer modal-footer-spread">
                    <button className="btn btn-danger" onClick={() => setShowModal(false)}>Cancel</button>
                    <button className="btn btn-primary" onClick={() => setShowModal(false)}>Confirm</button>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Utilities Section */}
          <section id="utilities" className="mb-16 scroll-mt-8">
            <div className="section-header">
              <Sparkles className="w-5 h-5 text-neon-primary" />
              <h2 className="text-title">Utilities</h2>
            </div>

            <Example
              title="Animations"
              code={`<div class="animate-fade-in">Fade In</div>
<div class="animate-slide-up">Slide Up</div>
<div class="animate-pulse">Pulse</div>
<div class="animate-spin">Spin</div>`}
            >
              <div className="flex items-center gap-6">
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setAnimationKey(k => k + 1)}
                >
                  Replay
                </button>
                <div key={animationKey} className="flex gap-6">
                  <div className="card p-4 animate-fade-in text-primary">Fade In</div>
                  <div className="card p-4 animate-slide-up text-primary">Slide Up</div>
                  <div className="card p-4 animate-pulse text-primary">Pulse</div>
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              </div>
            </Example>

            <Example
              title="Glow Effects"
              code={`<div class="glow-primary">Primary Glow</div>
<div class="glow-secondary">Secondary Glow</div>
<div class="glow-tertiary">Tertiary Glow</div>
<div class="glow-quaternary">Quaternary Glow</div>`}
            >
              <div className="flex gap-4">
                <div className="card p-4 glow-primary">Primary Glow</div>
                <div className="card p-4 glow-secondary">Secondary Glow</div>
                <div className="card p-4 glow-tertiary">Tertiary Glow</div>
                <div className="card p-4 glow-quaternary">Quaternary Glow</div>
              </div>
            </Example>

            <Example
              title="Neon Borders"
              code={`<div class="border-neon-primary">Primary (Cyan)</div>
<div class="border-neon-secondary">Secondary (Magenta)</div>
<div class="border-neon-tertiary">Tertiary (Green)</div>
<div class="border-neon-quaternary">Quaternary (Orange)</div>`}
            >
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg border-neon-primary">Primary (Cyan)</div>
                <div className="p-4 rounded-lg border-neon-secondary">Secondary (Magenta)</div>
                <div className="p-4 rounded-lg border-neon-tertiary">Tertiary (Green)</div>
                <div className="p-4 rounded-lg border-neon-quaternary">Quaternary (Orange)</div>
              </div>
            </Example>

            <Example
              title="Dividers"
              code={`<div class="divider"></div>
<div class="divider-faded"></div>`}
            >
              <div className="space-y-4">
                <p className="text-body">Content above</p>
                <div className="divider" />
                <p className="text-body">Standard divider</p>
                <div className="divider-faded" />
                <p className="text-body">Faded divider</p>
              </div>
            </Example>

            <Example
              title="Layout Helpers"
              code={`/* Flex utilities */
.flex-center    /* center both axes */
.flex-between   /* space-between */
.flex-start     /* align start */
.flex-end       /* align end */
.flex-col       /* column direction */
.flex-row       /* row direction */
.flex-wrap      /* wrap items */
.flex-1         /* flex: 1 */

/* Grid utilities */
.grid-cols-2    /* 2 column grid */
.grid-cols-3    /* 3 column grid */
.grid-cols-4    /* 4 column grid */

/* Gap utilities */
.gap-1 .gap-2 .gap-3 .gap-4 .gap-6 .gap-8

/* Positioning */
.relative .absolute .fixed .sticky`}
            >
              <div className="space-y-4">
                <div className="card p-4 flex-center h-20">
                  <span>flex-center</span>
                </div>
                <div className="card p-4 flex-between">
                  <span>Left</span>
                  <span>flex-between</span>
                  <span>Right</span>
                </div>
                <div className="grid-cols-3 gap-4">
                  <div className="card p-4 flex-center">1</div>
                  <div className="card p-4 flex-center">2</div>
                  <div className="card p-4 flex-center">3</div>
                </div>
                <div className="flex-row gap-4">
                  <div className="card p-4 flex-1 flex-center">flex-1</div>
                  <div className="card p-4 flex-1 flex-center">flex-1</div>
                </div>
              </div>
            </Example>

            <Example
              title="Skeleton Loading"
              code={`<div class="skeleton h-4 w-32"></div>
<div class="skeleton h-8 w-full"></div>`}
            >
              <div className="space-y-3">
                <div className="skeleton h-4 w-32" />
                <div className="skeleton h-4 w-48" />
                <div className="skeleton h-8 w-full" />
                <div className="flex gap-4">
                  <div className="skeleton h-16 w-16 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="skeleton h-4 w-24" />
                    <div className="skeleton h-4 w-full" />
                  </div>
                </div>
              </div>
            </Example>
          </section>

        </main>
      </div>
    </div>
  );
};

export default StyleGuide;
