import { useEffect } from 'react';

export function useKeyboardShortcuts(handlers) {
  useEffect(() => {
    const handleKeyPress = (e) => {
      // Check if user is not typing in input/textarea
      const isInputActive = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName);
      
      if (isInputActive) return;

      // Ctrl/Cmd + Shortcuts
      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 'n': // New Product
            e.preventDefault();
            handlers.onNewProduct?.();
            break;
          case 'k': // New Customer
            e.preventDefault();
            handlers.onNewCustomer?.();
            break;
          case 'h': // Help/Shortcuts
            e.preventDefault();
            handlers.onShowHelp?.();
            break;
          case 'f': // Focus search
            e.preventDefault();
            const searchInput = document.querySelector('input[placeholder*="Search"]');
            if (searchInput) searchInput.focus();
            break;
          case 's': // Save (if applicable)
            e.preventDefault();
            handlers.onSave?.();
            break;
        }
      }
      
      // Alt + Number shortcuts for tabs
      if (e.altKey) {
        const tabMap = {
          '1': 'dashboard',
          '2': 'pos',
          '3': 'products',
          '4': 'customers',
          '5': 'invoices',
          '6': 'analytics',
          '7': 'reports'
        };
        
        if (tabMap[e.key]) {
          e.preventDefault();
          handlers.onTabChange?.(tabMap[e.key]);
        }
      }
      
      // F-key shortcuts
      if (!e.ctrlKey && !e.altKey) {
        const fKeyMap = {
          'F1': 'dashboard',
          'F2': 'pos',
          'F3': 'products',
          'F4': 'customers',
          'F5': 'invoices',
          'F6': 'analytics',
          'F7': 'reports'
        };
        
        if (fKeyMap[e.key]) {
          e.preventDefault();
          handlers.onTabChange?.(fKeyMap[e.key]);
        }
      }

      // Escape key
      if (e.key === 'Escape') {
        handlers.onEscape?.();
      }

      // Enter key
      if (e.key === 'Enter' && !isInputActive) {
        handlers.onEnter?.();
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handlers]);

  const getShortcutsHelp = () => {
    return `Keyboard Shortcuts:

Tab Navigation:
Alt+1 or F1: Dashboard
Alt+2 or F2: POS System
Alt+3 or F3: Products
Alt+4 or F4: Customers
Alt+5 or F5: Invoices
Alt+6 or F6: Analytics
Alt+7 or F7: Reports

Actions:
Ctrl+N: New Product
Ctrl+K: New Customer
Ctrl+F: Search Products
Ctrl+H: Show Shortcuts
Ctrl+S: Save (where applicable)

General:
Esc: Close modals/dialogs
Enter: Confirm actions`;
  };

  return { getShortcutsHelp };
}
