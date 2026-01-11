/**
 * Public Routes Module
 * Handles public access endpoints (no authentication required)
 */

const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');
const { getDB } = require('../db');
const logger = require('../logger');
const { COMPANY_NAME, COMPANY_PHONE, COMPANY_ADDRESS, COMPANY_EMAIL, COMPANY_GSTIN } = require('../config/constants');

/**
 * GET /public/invoice/:token
 * Public invoice view by token (no authentication required)
 */
router.get('/invoice/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const db = getDB();

    const entry = await db.collection('public_invoice_links').findOne({ token });
    if (!entry) return res.status(404).send('Link not found');
    if (entry.expiresAt && new Date(entry.expiresAt) < new Date()) {
      return res.status(410).send('Link expired');
    }

    const invoiceId = entry.invoiceId;
    let invoice = null;
    try {
      invoice = await db.collection('bills').findOne({ _id: new ObjectId(invoiceId) });
    } catch (e) {}
    if (!invoice) invoice = await db.collection('bills').findOne({ billNumber: invoiceId });
    if (!invoice) return res.status(404).send('Invoice not found');

    // Public printable invoice page
    res.set('Content-Type', 'text/html');
    const companySnapshot = entry.companySnapshot || {};
    const companyName = companySnapshot.name || invoice.companyName || COMPANY_NAME;
    const companyPhone = companySnapshot.phone || invoice.companyPhone || COMPANY_PHONE;
    const companyAddress = companySnapshot.address || invoice.companyAddress || COMPANY_ADDRESS;
    const companyEmail = companySnapshot.email || invoice.companyEmail || COMPANY_EMAIL;
    const companyGSTIN = companySnapshot.gstin || invoice.companyGst || COMPANY_GSTIN;
    const invoiceDate = invoice.billDate || invoice.created_at || invoice.date || new Date().toISOString();

    res.send(`<!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width,initial-scale=1" />
          <title>Invoice ${invoice.billNumber || invoice._id}</title>
          <style>
            :root { --maxw: 842px; --page-bg: #f7fafc; }
            html,body{height:100%;}
            body{font-family:Segoe UI,Arial,sans-serif;padding:20px;background:var(--page-bg);color:#111}
            .paper{background:#fff;max-width:760px;margin:16px auto;padding:20px;border-radius:6px;box-shadow:0 6px 20px rgba(0,0,0,.08)}
            .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px}
            .company{font-size:20px;font-weight:700;color:#222}
            .meta{font-size:13px;color:#444;text-align:right}
            .customer{display:flex;justify-content:space-between;margin-bottom:12px}
            table{width:100%;border-collapse:collapse;margin-top:8px}
            th,td{padding:8px;border-bottom:1px solid #eee;text-align:left;font-size:13px}
            th{background:#fafafa;font-weight:700}
            tfoot td{border-top:2px solid #ddd;font-weight:700}
            .totals{margin-top:12px;display:flex;justify-content:flex-end;gap:12px}
            .totals .col{min-width:220px;background:#fafafa;padding:10px;border-radius:6px}
            .print-cta{margin-top:16px;text-align:center}
            .small{font-size:12px;color:#666}
            @media print{ body{background:white} .paper{box-shadow:none;border-radius:0} .print-cta{display:none} }
          </style>
        </head>
        <body>
          <div class="paper">
            <div class="header">
              <div style="flex:1;">
                <div style="font-size:36px;margin-bottom:6px;">⚡</div>
                <div class="company">${companyName}</div>
                <div class="small">${companyAddress}</div>
                <div class="small">Phone: ${companyPhone || '—'} ${companyEmail ? ' | Email: ' + companyEmail : ''}</div>
                ${companyGSTIN ? `<div class="small">GSTIN: ${companyGSTIN}</div>` : ''}
              </div>
              <div class="meta" style="text-align:right;min-width:240px;">
                <div><strong style="font-size:18px;padding:8px 12px;background:#111;color:#fff;display:inline-block;letter-spacing:2px">TAX INVOICE</strong></div>
                <div style="margin-top:10px">Invoice: <strong>${invoice.billNumber || invoice._id}</strong></div>
                <div>Date: ${new Date(invoiceDate).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}</div>
                <div>Time: ${new Date(invoiceDate).toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' })}</div>
              </div>
            </div>

            <div class="customer">
              <div>
                <div><strong>Customer</strong></div>
                <div>${invoice.customerName || invoice.customer || invoice.customer_name || 'Walk-in'}</div>
                ${ (invoice.customerPlace || invoice.customer_place) ? `<div class="small">Place: ${invoice.customerPlace || invoice.customer_place}</div>` : '' }
                ${ (invoice.customerPincode || invoice.customer_pincode) ? `<div class="small">PIN: ${invoice.customerPincode || invoice.customer_pincode}</div>` : '' }
                ${ (invoice.customerPhone || invoice.customer_phone) ? `<div class="small">Phone: ${invoice.customerPhone || invoice.customer_phone}</div>` : '' }
                ${ (invoice.customerAddress || invoice.customer_address) ? `<div class="small">${invoice.customerAddress || invoice.customer_address}</div>` : '' }
              </div>
              <div style="text-align:right">
                <div><strong class="small">Salesperson</strong></div>
                <div class="small">${invoice.createdByUsername || invoice.username || invoice.seller || '—'}</div>
              </div>
            </div>

            <table>
              <thead>
                <tr><th style="width:50px">S.No</th><th>Item</th><th style="width:70px;text-align:right">Qty</th><th style="width:120px;text-align:right">Rate (₹)</th><th style="width:120px;text-align:right">Amount (₹)</th></tr>
              </thead>
              <tbody>
                ${ (invoice.items || []).map((it, idx) => {
                  const name = (it.productName || it.name || 'Item').toString().slice(0, 200);
                  const qty = Number(it.quantity || it.qty || 0);
                  const rate = Number(it.unitPrice || it.price || it.rate || 0).toFixed(2);
                  const amount = (qty * Number(it.unitPrice || it.price || it.rate || 0)).toFixed(2);
                  return `<tr><td style="vertical-align:middle">${idx+1}</td><td>${name}</td><td style="text-align:right">${qty}</td><td style="text-align:right">${Number(rate).toFixed(2)}</td><td style="text-align:right">${amount}</td></tr>`;
                }).join('') }
              </tbody>
            </table>

            <div class="totals">
              <div class="col">
                <div style="display:flex;justify-content:space-between;margin-bottom:6px"><div class="small">Subtotal</div><div>₹${Number(invoice.subtotal || invoice.totalBeforeTax || 0).toFixed(2)}</div></div>
                <div style="display:flex;justify-content:space-between;margin-bottom:6px"><div class="small">Discount ${invoice.discountPercent ? '(' + invoice.discountPercent + '%)' : ''}</div><div>- ₹${Number(invoice.discountAmount || 0).toFixed(2)}</div></div>
                <div style="display:flex;justify-content:space-between;margin-bottom:6px"><div class="small">After Discount</div><div>₹${Number(invoice.afterDiscount || ((invoice.subtotal || invoice.totalBeforeTax || 0) - (invoice.discountAmount || 0))).toFixed(2)}</div></div>
                <div style="display:flex;justify-content:space-between;margin-bottom:6px"><div class="small">GST (${invoice.taxRate || 18}%):</div><div>₹${Number(invoice.gstAmount || invoice.taxAmount || 0).toFixed(2)}</div></div>
                <div style="display:flex;justify-content:space-between;border-top:1px dashed #ddd;padding-top:8px;margin-top:8px; font-weight:700"><div>Grand Total</div><div>₹${Number(invoice.grandTotal || invoice.total || 0).toFixed(2)}</div></div>
              </div>
            </div>

            <div style="margin-top:14px;padding:12px;background:#f9f9f9;border:1px dashed #ccc">
              <strong>Amount in Words: </strong><span id="amount-in-words"></span>
            </div>

            <div style="margin-top:14px;background:#fff;padding:10px;border:1px dotted #ccc">
              <strong>Terms & Conditions:</strong>
              <ol style="margin-top:6px;color:#444">
                <li>Goods once sold cannot be returned or exchanged.</li>
                <li>Payment is due at the time of purchase.</li>
                <li>Subject to local jurisdiction only.</li>
                <li>E. &amp; O.E. (Errors and Omissions Excepted)</li>
              </ol>
            </div>

            <div style="display:flex;justify-content:space-between;margin-top:24px">
              <div style="text-align:center;width:45%"><div style="border-top:1px solid #000;padding-top:10px;">Customer Signature</div></div>
              <div style="text-align:center;width:45%"><div style="border-top:1px solid #000;padding-top:10px;">Authorized Signatory</div></div>
            </div>

            <div style="margin-top:14px" class="small">This link expires on ${entry.expiresAt ? new Date(entry.expiresAt).toLocaleDateString() + ', ' + new Date(entry.expiresAt).toLocaleTimeString() : '—'}</div>

            <div class="print-cta"><button onclick="window.print()" style="padding:8px 14px;border-radius:6px;background:#111;color:#fff;border:none;cursor:pointer;margin-top:12px">Print / Save PDF</button></div>

            <script>
              // Render amount in words
              (function(){
                function numberToWords(num){
                  const ones=['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine'];
                  const teens=['Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
                  const tens=['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
                  function convertHundreds(n){
                    let s='';
                    if(n>99){ s += ones[Math.floor(n/100)] + ' Hundred '; n = n%100 }
                    if(n>19){ s += tens[Math.floor(n/10)] + ' '; n = n%10 }
                    else if(n>=10){ s += teens[n-10] + ' '; return s.trim() }
                    s += ones[n] + ' ';
                    return s.trim();
                  }
                  if(num===0) return 'Zero';
                  if(num>=10000000) return convertHundreds(Math.floor(num/10000000)) + ' Crore ' + numberToWords(num%10000000);
                  if(num>=100000) return convertHundreds(Math.floor(num/100000)) + ' Lakh ' + numberToWords(num%100000);
                  if(num>=1000) return convertHundreds(Math.floor(num/1000)) + ' Thousand ' + numberToWords(num%1000);
                  return convertHundreds(num);
                }
                const total = ${Number(invoice.grandTotal || invoice.total || 0).toFixed(0)};
                const el = document.getElementById('amount-in-words');
                if(el) el.innerText = numberToWords(total) + ' Rupees Only';
              })();
            </script>
            ${req.query.print === '1' ? '<script>window.print();</script>' : ''}
          </div>
        </body>
      </html>`);

  } catch (e) {
    logger.error('Public invoice serve error', e);
    res.status(500).send('Server error');
  }
});

module.exports = router;
