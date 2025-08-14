/**
 * The Ownership Layer - Public Embedding SDK
 * JavaScript SDK for embedding attribution badges and content verification
 */

(function(global) {
    'use strict';

    const API_BASE_URL = 'https://api.ownership-layer.com'; // Production URL
    const VERSION = '1.0.0';

    class OwnershipLayerSDK {
        constructor(options = {}) {
            this.apiKey = options.apiKey;
            this.baseUrl = options.baseUrl || API_BASE_URL;
            this.theme = options.theme || 'light';
            this.position = options.position || 'bottom-right';
            this.autoInit = options.autoInit !== false;
            
            if (this.autoInit) {
                this.init();
            }
        }

        /**
         * Initialize the SDK
         */
        init() {
            this.injectStyles();
            this.scanForContent();
            
            // Auto-scan for new content periodically
            setInterval(() => this.scanForContent(), 5000);
        }

        /**
         * Manually add attribution badge to an element
         */
        addAttributionBadge(element, options = {}) {
            const fingerprintId = options.fingerprintId || element.dataset.fingerprintId;
            const contentType = options.contentType || this.detectContentType(element);
            
            if (!fingerprintId) {
                console.warn('OwnershipLayer: No fingerprint ID provided');
                return;
            }

            this.fetchAttributionData(fingerprintId)
                .then(data => {
                    const badge = this.createAttributionBadge(data, options);
                    this.attachBadge(element, badge, options.position || this.position);
                })
                .catch(err => {
                    console.error('OwnershipLayer: Failed to fetch attribution data', err);
                });
        }

        /**
         * Verify content ownership
         */
        async verifyOwnership(fingerprintId) {
            try {
                const response = await fetch(`${this.baseUrl}/api/attribution-chain/${fingerprintId}`, {
                    headers: this.getHeaders()
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }
                
                return await response.json();
            } catch (error) {
                console.error('OwnershipLayer: Ownership verification failed', error);
                return null;
            }
        }

        /**
         * Report content reuse
         */
        async reportReuse(originalFingerprintId, reuseUrl, context = {}) {
            try {
                const response = await fetch(`${this.baseUrl}/api/report-reuse`, {
                    method: 'POST',
                    headers: this.getHeaders(),
                    body: JSON.stringify({
                        original_fingerprint_id: originalFingerprintId,
                        reuse_url: reuseUrl,
                        context: context,
                        detected_by: 'sdk_user_report'
                    })
                });
                
                return await response.json();
            } catch (error) {
                console.error('OwnershipLayer: Failed to report reuse', error);
                return null;
            }
        }

        /**
         * Scan page for content with ownership data
         */
        scanForContent() {
            // Look for elements with data-fingerprint-id
            const elements = document.querySelectorAll('[data-fingerprint-id]');
            
            elements.forEach(element => {
                if (!element.hasAttribute('data-owl-processed')) {
                    this.addAttributionBadge(element);
                    element.setAttribute('data-owl-processed', 'true');
                }
            });

            // Look for elements with data-owl-verify
            const verifyElements = document.querySelectorAll('[data-owl-verify]');
            
            verifyElements.forEach(element => {
                if (!element.hasAttribute('data-owl-verified')) {
                    this.verifyAndMarkContent(element);
                    element.setAttribute('data-owl-verified', 'true');
                }
            });
        }

        /**
         * Create attribution badge HTML
         */
        createAttributionBadge(attributionData, options = {}) {
            const badge = document.createElement('div');
            badge.className = `owl-attribution-badge owl-theme-${this.theme}`;
            
            const creator = attributionData.original_creator;
            const verificationStatus = attributionData.verification_status;
            
            badge.innerHTML = `
                <div class="owl-badge-content">
                    <div class="owl-badge-icon">
                        ${this.getVerificationIcon(verificationStatus)}
                    </div>
                    <div class="owl-badge-text">
                        <div class="owl-creator-name">${creator.name}</div>
                        <div class="owl-verification-status">${this.getVerificationText(verificationStatus)}</div>
                    </div>
                    <div class="owl-badge-actions">
                        <button class="owl-btn-verify" data-fingerprint-id="${attributionData.fingerprint_id}">
                            Verify
                        </button>
                        <button class="owl-btn-report" data-fingerprint-id="${attributionData.fingerprint_id}">
                            Report
                        </button>
                    </div>
                </div>
                <div class="owl-badge-details" style="display: none;">
                    <div class="owl-detail-row">
                        <span>Created:</span>
                        <span>${new Date(attributionData.created_at).toLocaleDateString()}</span>
                    </div>
                    <div class="owl-detail-row">
                        <span>Type:</span>
                        <span>${attributionData.content_type}</span>
                    </div>
                    <div class="owl-detail-row">
                        <span>Views:</span>
                        <span>${attributionData.total_views || 0}</span>
                    </div>
                    ${attributionData.blockchain_record ? `
                        <div class="owl-detail-row">
                            <span>Blockchain:</span>
                            <a href="${attributionData.blockchain_record.verification_url}" target="_blank">
                                Verified on-chain
                            </a>
                        </div>
                    ` : ''}
                </div>
            `;

            // Add event listeners
            this.addBadgeEventListeners(badge, attributionData);

            return badge;
        }

        /**
         * Attach badge to element
         */
        attachBadge(element, badge, position = 'bottom-right') {
            // Make parent element relative if not already positioned
            const computedStyle = window.getComputedStyle(element);
            if (computedStyle.position === 'static') {
                element.style.position = 'relative';
            }

            badge.classList.add(`owl-position-${position}`);
            element.appendChild(badge);
        }

        /**
         * Add event listeners to badge
         */
        addBadgeEventListeners(badge, attributionData) {
            // Toggle details on click
            badge.addEventListener('click', (e) => {
                if (e.target.classList.contains('owl-btn-verify') || e.target.classList.contains('owl-btn-report')) {
                    return; // Don't toggle for button clicks
                }
                
                const details = badge.querySelector('.owl-badge-details');
                details.style.display = details.style.display === 'none' ? 'block' : 'none';
            });

            // Verify button
            const verifyBtn = badge.querySelector('.owl-btn-verify');
            if (verifyBtn) {
                verifyBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.showVerificationModal(attributionData);
                });
            }

            // Report button
            const reportBtn = badge.querySelector('.owl-btn-report');
            if (reportBtn) {
                reportBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.showReportModal(attributionData);
                });
            }
        }

        /**
         * Show verification modal
         */
        showVerificationModal(attributionData) {
            const modal = this.createModal('verification', attributionData);
            document.body.appendChild(modal);
        }

        /**
         * Show report modal
         */
        showReportModal(attributionData) {
            const modal = this.createModal('report', attributionData);
            document.body.appendChild(modal);
        }

        /**
         * Create modal dialog
         */
        createModal(type, attributionData) {
            const modal = document.createElement('div');
            modal.className = 'owl-modal-overlay';
            
            const content = type === 'verification' 
                ? this.createVerificationContent(attributionData)
                : this.createReportContent(attributionData);
            
            modal.innerHTML = `
                <div class="owl-modal">
                    <div class="owl-modal-header">
                        <h3>${type === 'verification' ? 'Content Verification' : 'Report Reuse'}</h3>
                        <button class="owl-modal-close">&times;</button>
                    </div>
                    <div class="owl-modal-body">
                        ${content}
                    </div>
                </div>
            `;

            // Add close functionality
            modal.addEventListener('click', (e) => {
                if (e.target === modal || e.target.classList.contains('owl-modal-close')) {
                    modal.remove();
                }
            });

            return modal;
        }

        /**
         * Create verification modal content
         */
        createVerificationContent(attributionData) {
            return `
                <div class="owl-verification-content">
                    <div class="owl-creator-info">
                        <h4>Original Creator</h4>
                        <p><strong>${attributionData.original_creator.name}</strong></p>
                        <p>Created: ${new Date(attributionData.created_at).toLocaleDateString()}</p>
                    </div>
                    
                    <div class="owl-verification-details">
                        <h4>Verification Details</h4>
                        <ul>
                            <li>Content Type: ${attributionData.content_type}</li>
                            <li>Fingerprint ID: ${attributionData.fingerprint_id}</li>
                            <li>Status: ${attributionData.verification_status}</li>
                            <li>Total Attributions: ${attributionData.total_attributions}</li>
                        </ul>
                    </div>
                    
                    ${attributionData.blockchain_record ? `
                        <div class="owl-blockchain-proof">
                            <h4>Blockchain Verification</h4>
                            <p>This content is verified on the blockchain.</p>
                            <a href="${attributionData.blockchain_record.verification_url}" target="_blank" class="owl-btn-primary">
                                View on Blockchain
                            </a>
                        </div>
                    ` : ''}
                </div>
            `;
        }

        /**
         * Create report modal content
         */
        createReportContent(attributionData) {
            return `
                <form class="owl-report-form">
                    <div class="owl-form-group">
                        <label>Report Type:</label>
                        <select name="report_type" required>
                            <option value="unauthorized_use">Unauthorized Use</option>
                            <option value="missing_attribution">Missing Attribution</option>
                            <option value="false_claim">False Ownership Claim</option>
                        </select>
                    </div>
                    
                    <div class="owl-form-group">
                        <label>URL of Reuse:</label>
                        <input type="url" name="reuse_url" placeholder="https://..." required>
                    </div>
                    
                    <div class="owl-form-group">
                        <label>Additional Details:</label>
                        <textarea name="details" rows="4" placeholder="Describe the issue..."></textarea>
                    </div>
                    
                    <div class="owl-form-actions">
                        <button type="submit" class="owl-btn-primary">Submit Report</button>
                        <button type="button" class="owl-btn-secondary owl-modal-close">Cancel</button>
                    </div>
                </form>
            `;
        }

        /**
         * Fetch attribution data from API
         */
        async fetchAttributionData(fingerprintId) {
            const response = await fetch(`${this.baseUrl}/api/attribution-chain/${fingerprintId}`, {
                headers: this.getHeaders()
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            return await response.json();
        }

        /**
         * Get API headers
         */
        getHeaders() {
            const headers = {
                'Content-Type': 'application/json',
                'User-Agent': `OwnershipLayer-SDK/${VERSION}`
            };
            
            if (this.apiKey) {
                headers['Authorization'] = `Bearer ${this.apiKey}`;
            }
            
            return headers;
        }

        /**
         * Detect content type from element
         */
        detectContentType(element) {
            if (element.tagName === 'IMG') return 'image';
            if (element.tagName === 'VIDEO') return 'video';
            if (element.tagName === 'AUDIO') return 'audio';
            if (element.tagName === 'PRE' || element.classList.contains('code')) return 'code';
            return 'text';
        }

        /**
         * Get verification icon
         */
        getVerificationIcon(status) {
            const icons = {
                'verified': '✓',
                'pending': '⏳',
                'disputed': '⚠️',
                'unverified': '?'
            };
            return icons[status] || icons['unverified'];
        }

        /**
         * Get verification text
         */
        getVerificationText(status) {
            const texts = {
                'verified': 'Verified Creator',
                'pending': 'Verification Pending',
                'disputed': 'Ownership Disputed',
                'unverified': 'Unverified'
            };
            return texts[status] || texts['unverified'];
        }

        /**
         * Inject CSS styles
         */
        injectStyles() {
            if (document.getElementById('owl-sdk-styles')) return;
            
            const styles = document.createElement('style');
            styles.id = 'owl-sdk-styles';
            styles.textContent = `
                .owl-attribution-badge {
                    position: absolute;
                    z-index: 1000;
                    background: rgba(0, 0, 0, 0.8);
                    color: white;
                    border-radius: 6px;
                    padding: 8px 12px;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    font-size: 12px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    max-width: 250px;
                    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
                }
                
                .owl-attribution-badge:hover {
                    background: rgba(0, 0, 0, 0.9);
                    transform: translateY(-2px);
                }
                
                .owl-theme-light {
                    background: rgba(255, 255, 255, 0.95);
                    color: #333;
                    border: 1px solid #ddd;
                }
                
                .owl-position-bottom-right {
                    bottom: 8px;
                    right: 8px;
                }
                
                .owl-position-bottom-left {
                    bottom: 8px;
                    left: 8px;
                }
                
                .owl-position-top-right {
                    top: 8px;
                    right: 8px;
                }
                
                .owl-position-top-left {
                    top: 8px;
                    left: 8px;
                }
                
                .owl-badge-content {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                
                .owl-badge-icon {
                    font-size: 14px;
                }
                
                .owl-badge-text {
                    flex: 1;
                    min-width: 0;
                }
                
                .owl-creator-name {
                    font-weight: 600;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                
                .owl-verification-status {
                    font-size: 10px;
                    opacity: 0.8;
                }
                
                .owl-badge-actions {
                    display: flex;
                    gap: 4px;
                }
                
                .owl-btn-verify, .owl-btn-report {
                    background: rgba(255, 255, 255, 0.2);
                    border: none;
                    color: inherit;
                    padding: 4px 8px;
                    border-radius: 4px;
                    font-size: 10px;
                    cursor: pointer;
                    transition: background 0.2s;
                }
                
                .owl-btn-verify:hover, .owl-btn-report:hover {
                    background: rgba(255, 255, 255, 0.3);
                }
                
                .owl-badge-details {
                    margin-top: 8px;
                    padding-top: 8px;
                    border-top: 1px solid rgba(255, 255, 255, 0.2);
                    font-size: 11px;
                }
                
                .owl-detail-row {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 4px;
                }
                
                .owl-modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.5);
                    z-index: 10000;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                
                .owl-modal {
                    background: white;
                    border-radius: 8px;
                    max-width: 500px;
                    width: 90%;
                    max-height: 80vh;
                    overflow-y: auto;
                    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
                }
                
                .owl-modal-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 20px;
                    border-bottom: 1px solid #eee;
                }
                
                .owl-modal-close {
                    background: none;
                    border: none;
                    font-size: 24px;
                    cursor: pointer;
                    color: #999;
                }
                
                .owl-modal-body {
                    padding: 20px;
                }
                
                .owl-form-group {
                    margin-bottom: 16px;
                }
                
                .owl-form-group label {
                    display: block;
                    margin-bottom: 4px;
                    font-weight: 600;
                }
                
                .owl-form-group input,
                .owl-form-group select,
                .owl-form-group textarea {
                    width: 100%;
                    padding: 8px 12px;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    font-family: inherit;
                }
                
                .owl-form-actions {
                    display: flex;
                    gap: 12px;
                    justify-content: flex-end;
                    margin-top: 20px;
                }
                
                .owl-btn-primary {
                    background: #007bff;
                    color: white;
                    border: none;
                    padding: 10px 20px;
                    border-radius: 4px;
                    cursor: pointer;
                    text-decoration: none;
                    display: inline-block;
                }
                
                .owl-btn-secondary {
                    background: #6c757d;
                    color: white;
                    border: none;
                    padding: 10px 20px;
                    border-radius: 4px;
                    cursor: pointer;
                }
            `;
            
            document.head.appendChild(styles);
        }

        /**
         * Verify and mark content
         */
        async verifyAndMarkContent(element) {
            const contentText = element.textContent || element.innerText;
            const contentType = this.detectContentType(element);
            
            try {
                const response = await fetch(`${this.baseUrl}/api/match`, {
                    method: 'POST',
                    headers: this.getHeaders(),
                    body: JSON.stringify({
                        content: contentText,
                        content_type: contentType,
                        threshold: 0.8
                    })
                });
                
                if (response.ok) {
                    const matches = await response.json();
                    if (matches.matches && matches.matches.length > 0) {
                        // Found matches - add attribution badge
                        const match = matches.matches[0];
                        element.dataset.fingerprintId = match.fingerprint_id;
                        this.addAttributionBadge(element);
                    }
                }
            } catch (error) {
                console.error('OwnershipLayer: Content verification failed', error);
            }
        }
    }

    // Auto-initialize if API key is provided via meta tag
    document.addEventListener('DOMContentLoaded', () => {
        const metaTag = document.querySelector('meta[name="ownership-layer-api-key"]');
        if (metaTag) {
            const apiKey = metaTag.getAttribute('content');
            new OwnershipLayerSDK({ apiKey });
        }
    });

    // Export to global scope
    global.OwnershipLayerSDK = OwnershipLayerSDK;
    global.OwnershipLayer = OwnershipLayerSDK; // Alias

})(typeof window !== 'undefined' ? window : this);
