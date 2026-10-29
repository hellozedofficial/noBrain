import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "noBrain",
  description: "noBrain AI Chat Platform",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} dark h-full antialiased`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                // 0. Synchronously restore saved theme from localStorage
                try {
                  var savedTheme = localStorage.getItem('nobrain_theme') || 'system';
                  var isDark = savedTheme === 'dark' || (savedTheme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
                  var root = document.documentElement;
                  if (isDark) {
                    root.classList.add('dark');
                    root.classList.remove('light');
                  } else {
                    root.classList.add('light');
                    root.classList.remove('dark');
                  }
                } catch(e) {}

                // 1. Intercept console.error to prevent Next.js dev overlay from showing extension-caused hydration errors
                var origError = console.error;
                console.error = function() {
                  var msg = '';
                  for (var i = 0; i < arguments.length; i++) {
                    msg += ' ' + (typeof arguments[i] === 'object' ? JSON.stringify(arguments[i]) : String(arguments[i]));
                  }
                  if (
                    msg.indexOf('bis_skin_checked') !== -1 ||
                    msg.indexOf('data-zed-assistant') !== -1 ||
                    msg.indexOf('M_ID') !== -1 ||
                    (msg.indexOf('hydrated') !== -1 && msg.indexOf('extension') !== -1) ||
                    (msg.indexOf('hydration') !== -1 && (msg.indexOf('bis_skin_checked') !== -1 || msg.indexOf('extension') !== -1))
                  ) {
                    return; // Suppress false-positive hydration warning caused by browser extensions
                  }
                  origError.apply(console, arguments);
                };

                // 2. Strip extension injected attributes from DOM in real time
                if (typeof MutationObserver !== 'undefined') {
                  var clean = function(el) {
                    if (el && el.removeAttribute) {
                      if (el.hasAttribute('bis_skin_checked')) el.removeAttribute('bis_skin_checked');
                      if (el.hasAttribute('data-zed-assistant')) el.removeAttribute('data-zed-assistant');
                    }
                  };
                  var observer = new MutationObserver(function(mutations) {
                    for (var i = 0; i < mutations.length; i++) {
                      var m = mutations[i];
                      if (m.type === 'attributes') {
                        if (m.attributeName === 'bis_skin_checked' || m.attributeName === 'data-zed-assistant') {
                          m.target.removeAttribute(m.attributeName);
                        }
                      } else if (m.type === 'childList') {
                        for (var j = 0; j < m.addedNodes.length; j++) {
                          var node = m.addedNodes[j];
                          if (node.nodeType === 1) {
                            clean(node);
                            var children = node.querySelectorAll ? node.querySelectorAll('[bis_skin_checked], [data-zed-assistant]') : [];
                            for (var k = 0; k < children.length; k++) clean(children[k]);
                          }
                        }
                      }
                    }
                  });
                  observer.observe(document, { attributes: true, subtree: true, childList: true, attributeFilter: ['bis_skin_checked', 'data-zed-assistant'] });
                }

                // 3. Catch uncaught extension errors
                window.addEventListener('unhandledrejection', function(e) {
                  var str = (e && e.reason && (e.reason.stack || e.reason.message || String(e.reason))) || '';
                  if (str.indexOf('chrome-extension://') !== -1 || str.indexOf('M_ID') !== -1) {
                    e.preventDefault();
                    e.stopImmediatePropagation();
                  }
                }, true);

                window.addEventListener('error', function(e) {
                  var str = (e && (e.filename || e.message || '')) || '';
                  if (str.indexOf('chrome-extension://') !== -1 || str.indexOf('M_ID') !== -1) {
                    e.preventDefault();
                    e.stopImmediatePropagation();
                  }
                }, true);
              })();
            `,
          }}
        />
      </head>
      <body
        suppressHydrationWarning
        className="h-full bg-[#0d0d0d] text-[#ececec] flex flex-col overflow-hidden font-sans selection:bg-[#333333]"
      >
        {children}
      </body>
    </html>
  )
}
