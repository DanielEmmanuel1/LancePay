'use client';

import React from 'react';
import Link from 'next/link';
import { Twitter, Linkedin, Instagram } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-white border-t border-brand-border pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
          <div className="lg:col-span-2">
            <Link href="/" className="font-display font-bold text-2xl tracking-tight text-brand-black mb-4 block">
              Lancepay
            </Link>
            <p className="text-brand-gray max-w-xs mb-6">
              The fastest way for Nigerian freelancers to receive international payments.
            </p>
            <div className="flex space-x-4">
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="text-brand-gray hover:text-brand-black transition-colors">
                <Twitter size={20} />
              </a>
              <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="text-brand-gray hover:text-brand-black transition-colors">
                <Linkedin size={20} />
              </a>
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="text-brand-gray hover:text-brand-black transition-colors">
                <Instagram size={20} />
              </a>
            </div>
          </div>

          <div>
            <h3 className="font-display font-bold text-brand-black mb-4">Product</h3>
            <ul className="space-y-3">
              <li><a href="/#how-it-works" className="text-brand-gray hover:text-brand-black transition-colors text-sm">How It Works</a></li>
            </ul>
          </div>

          <div>
            <h3 className="font-display font-bold text-brand-black mb-4">Legal</h3>
            <ul className="space-y-3">
              <li><Link href="/terms-of-service" className="text-brand-gray hover:text-brand-black transition-colors text-sm">Terms of Service</Link></li>
              <li><Link href="/privacy-policy" className="text-brand-gray hover:text-brand-black transition-colors text-sm">Privacy Policy</Link></li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-brand-border flex flex-col md:flex-row justify-between items-center">
          <p className="text-brand-gray text-sm mb-4 md:mb-0">
            © {new Date().getFullYear()} Lancepay. All rights reserved.
          </p>
          <div className="flex items-center space-x-2 text-sm text-brand-black font-medium">
            <span>Built for</span>
            <span className="text-lg" role="img" aria-label="Nigeria flag">🇳🇬</span>
            <span>freelancers</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
