import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getCardData, submitPhoneNumber } from '../services/api';

// Color definitions matching the card colors
const CARD_COLORS = {
    blue: '#0088CC',
    black: '#1E1E1E'
};

/**
 * View Account Page - Displays account information from QR code scan
 * URL format: /view?id=cardUUID (new) or /view?data=encryptedBase64Data (legacy)
 */
const ViewAccountPage = () => {
    const [searchParams] = useSearchParams();
    const [accountData, setAccountData] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);

    // Phone collection state
    const [showPhoneModal, setShowPhoneModal] = useState(false);
    const [phoneNumber, setPhoneNumber] = useState('');
    const [phoneError, setPhoneError] = useState('');
    const [submittingPhone, setSubmittingPhone] = useState(false);
    const [phoneSubmitted, setPhoneSubmitted] = useState(false);

    useEffect(() => {
        const loadData = async () => {
            // Check for API-based card ID and token
            const cardId = searchParams.get('id');
            const token = searchParams.get('token');

            if (cardId) {
                // Fetch from backend API with token
                try {
                    const data = await getCardData(cardId, token);
                    setAccountData({ ...data, cardId });

                    // Show phone modal if this is first scan
                    if (data.is_first_scan) {
                        setShowPhoneModal(true);
                    }

                    setLoading(false);
                } catch (err) {
                    console.error('Failed to fetch card data:', err);
                    if (err.response?.status === 403) {
                        setError('Access denied. This QR code may be invalid or expired.');
                    } else if (err.response?.status === 404) {
                        setError('Card not found. This QR code may be invalid.');
                    } else {
                        setError('Failed to load card data. Please try again.');
                    }
                    setLoading(false);
                }
            } else {
                // Legacy: Check for encrypted data parameter
                const dataParam = searchParams.get('data');
                if (dataParam) {
                    try {
                        const { decryptData } = await import('../services/encryption');
                        const decrypted = await decryptData(decodeURIComponent(dataParam));
                        setAccountData(decrypted);
                        setLoading(false);
                    } catch (err) {
                        console.error('Failed to decrypt account data:', err);
                        setError('Invalid or tampered data. This QR code cannot be verified.');
                        setLoading(false);
                    }
                } else {
                    setError('No card data provided');
                    setLoading(false);
                }
            }
        };

        loadData();
    }, [searchParams]);

    const handlePhoneSubmit = async (e) => {
        e.preventDefault();
        setPhoneError('');

        if (!phoneNumber.trim()) {
            setPhoneError('Please enter your phone number');
            return;
        }

        // Basic phone validation
        const phoneRegex = /^[\+]?[0-9]{7,15}$/;
        if (!phoneRegex.test(phoneNumber.replace(/[\s\-]/g, ''))) {
            setPhoneError('Please enter a valid phone number');
            return;
        }

        setSubmittingPhone(true);
        try {
            await submitPhoneNumber(accountData.cardId, phoneNumber);
            setPhoneSubmitted(true);
            setShowPhoneModal(false);
        } catch (err) {
            console.error('Failed to submit phone number:', err);
            setPhoneError(err.response?.data?.message || 'Failed to save phone number. Please try again.');
        } finally {
            setSubmittingPhone(false);
        }
    };

    // Determine if email is iCloud or Gmail
    const getAccountType = (email) => {
        if (!email) return { title: 'Account', isApple: true };
        const lowerEmail = email.toLowerCase();
        if (lowerEmail.includes('@icloud.com') || lowerEmail.includes('@me.com') || lowerEmail.includes('@mac.com')) {
            return { title: 'Apple ID Account', isApple: true };
        } else if (lowerEmail.includes('@gmail.com') || lowerEmail.includes('@googlemail.com')) {
            return { title: 'Google ID Account', isApple: false };
        }
        return { title: 'Apple ID Account', isApple: true }; // Default to Apple
    };

    if (loading) {
        return (
            <div className="view-account-page" dir="rtl">
                <div className="view-account-container">
                    <div className="view-account-loading">
                        <div className="spinner"></div>
                        <p>جاري تحميل بيانات الحساب...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="view-account-page" dir="rtl">
                <div className="view-account-container error">
                    <div className="view-account-icon error">
                        <svg viewBox="0 0 24 24" width="64" height="64" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="15" y1="9" x2="9" y2="15" />
                            <line x1="9" y1="9" x2="15" y2="15" />
                        </svg>
                    </div>
                    <h1>خطأ</h1>
                    <p>{error}</p>
                    <p style={{ fontSize: '0.85em', color: '#888', marginTop: '1rem' }}>
                        يرجى الاتصال بالدعم إذا استمرت المشكلة.
                    </p>
                </div>
            </div>
        );
    }

    if (!accountData) {
        return (
            <div className="view-account-page" dir="rtl">
                <div className="view-account-container">
                    <div className="view-account-loading">
                        <div className="spinner"></div>
                        <p>جاري تحميل بيانات الحساب...</p>
                    </div>
                </div>
            </div>
        );
    }

    const { title, isApple } = getAccountType(accountData.email);
    const themeColor = CARD_COLORS[accountData.color] || CARD_COLORS.blue;

    return (
        <div className="view-account-page" dir="rtl" style={{ '--theme-color': themeColor }}>
            {/* Phone Collection Modal - Arabic with Usage Policy */}
            {showPhoneModal && (
                <div className="phone-modal-overlay" style={{ backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
                    <div className="phone-modal" dir="rtl" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
                        <button
                            type="button"
                            onClick={() => setShowPhoneModal(false)}
                            style={{
                                position: 'absolute',
                                top: '12px',
                                left: '12px',
                                background: 'transparent',
                                border: 'none',
                                borderRadius: '50%',
                                width: '32px',
                                height: '32px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                color: 'transparent',
                                fontSize: '18px',
                                fontWeight: 'bold',
                                opacity: 0
                            }}
                            title=""
                        >
                            ✕
                        </button>
                        <div className="phone-modal-header" style={{ background: themeColor }}>
                            <h2>مرحباً!</h2>
                            <p>لتفعيل حسابك، يرجى إدخال رقم هاتفك</p>
                        </div>

                        {/* Usage Policy Section */}
                        <div style={{
                            background: 'rgba(0,0,0,0.05)',
                            borderRadius: '12px',
                            padding: '16px',
                            margin: '16px',
                            fontSize: '13px',
                            lineHeight: '1.7',
                            textAlign: 'right',
                            color: '#333'
                        }}>
                            <div style={{ fontWeight: 'bold', marginBottom: '12px', color: themeColor, fontSize: '15px' }}>
                                ⚠️ سياسة الاستخدام
                            </div>
                            <p style={{ marginBottom: '10px' }}>
                                الكارت ينشأ يدوياً من هاتفك وليس حساب جاهز.
                            </p>
                            <p style={{ marginBottom: '10px' }}>
                                يعمل الحساب على <strong style={{ color: themeColor }}>{isApple ? 'Apple Store' : 'Google Play'}</strong> و {isApple ? 'iCloud' : 'Google Services'} ويدعم الشراء من داخل التطبيق.
                            </p>
                            <p style={{ marginBottom: '10px' }}>
                                سجل الحساب يدوياً في حال لم يعمل الباركود بعد مرور 3 أشهر.
                            </p>
                            <div style={{
                                background: 'rgba(255,0,0,0.08)',
                                border: '1px solid rgba(255,0,0,0.2)',
                                borderRadius: '8px',
                                padding: '12px',
                                marginTop: '12px'
                            }}>
                                <div style={{ fontWeight: 'bold', color: '#dc2626', marginBottom: '6px' }}>
                                    ⚖️ تنويه قانوني:
                                </div>
                                <p style={{ margin: 0, color: '#7f1d1d', fontSize: '12px' }}>
                                    يلتزم المستخدم بإيقاف ميزة العثور على الهاتف وفي حال عدم الالتزام تخلي الشركة والوكيل كامل المسؤولية القانونية والضمانية عن أي أضرار قد تحدث للهاتف.
                                </p>
                            </div>
                        </div>

                        <form onSubmit={handlePhoneSubmit} className="phone-modal-form">
                            {phoneError && (
                                <div className="phone-error" style={{ textAlign: 'right' }}>
                                    {phoneError}
                                </div>
                            )}
                            <div className="phone-input-group">
                                <label style={{ textAlign: 'right', display: 'block' }}>رقم الهاتف</label>
                                <input
                                    type="tel"
                                    value={phoneNumber}
                                    onChange={(e) => setPhoneNumber(e.target.value)}
                                    placeholder="مثال: 07xxxxxxxxx"
                                    autoFocus
                                    disabled={submittingPhone}
                                    style={{ textAlign: 'left', direction: 'ltr' }}
                                />
                            </div>
                            <button
                                type="submit"
                                className="phone-submit-btn"
                                style={{ background: themeColor }}
                                disabled={submittingPhone}
                            >
                                {submittingPhone ? 'جاري الحفظ...' : 'متابعة'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            <div className="view-account-container">
                {/* Success message after phone submission */}
                {phoneSubmitted && (
                    <div className="phone-success-banner" style={{ background: '#22c55e' }}>
                        ✓ تم تفعيل الحساب بنجاح!
                    </div>
                )}

                {/* Header */}
                <div className="view-account-header" style={{ background: themeColor }}>
                    <div className="view-account-icon">
                        {isApple ? (
                            <svg viewBox="0 0 24 24" width="48" height="48">
                                <rect width="24" height="24" rx="5" fill={themeColor} />
                                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" fill="white" />
                            </svg>
                        ) : (
                            <svg viewBox="0 0 24 24" width="48" height="48">
                                <rect width="24" height="24" rx="5" fill={themeColor} />
                                <path d="M12.545 10.239v3.821h5.445c-.712 2.315-2.647 3.972-5.445 3.972-3.332 0-6.033-2.701-6.033-6.032s2.701-6.032 6.033-6.032c1.498 0 2.866.549 3.921 1.453l2.814-2.814C17.503 2.988 15.139 2 12.545 2 7.021 2 2.543 6.477 2.543 12s4.478 10 10.002 10c8.396 0 10.249-7.85 9.426-11.748l-9.426-.013z" fill="white" />
                            </svg>
                        )}
                    </div>
                    <h1 style={{ color: 'white' }}>{isApple ? 'حساب Apple ID' : 'حساب Google ID'}</h1>
                    <p className="view-account-subtitle" style={{ color: 'rgba(255,255,255,0.8)' }}>بيانات الحساب الأمريكي</p>
                </div>

                {/* Verified Badge */}
                <div style={{ textAlign: 'center', marginTop: '-10px', marginBottom: '10px' }}>
                    <span style={{
                        background: '#22c55e',
                        color: 'white',
                        padding: '4px 12px',
                        borderRadius: '20px',
                        fontSize: '0.75rem',
                        fontWeight: 600
                    }}>
                        ✓ موثق وآمن
                    </span>
                </div>

                {/* Account Card */}
                <div className="view-account-card">
                    {/* Name Section */}
                    <div className="view-account-section name-section">
                        <div className="view-account-name">{accountData.name}</div>
                        <div className="view-account-badge" style={{ background: themeColor }}>موثق</div>
                    </div>

                    {/* Personal Info */}
                    <div className="view-account-section">
                        <div className="view-account-field">
                            <label>الاسم الأول</label>
                            <div className="view-account-value">{accountData.firstName || accountData.name?.split(' ')[0] || 'غير متوفر'}</div>
                        </div>

                        <div className="view-account-field">
                            <label>اسم العائلة</label>
                            <div className="view-account-value">{accountData.lastName || accountData.name?.split(' ').slice(1).join(' ') || 'غير متوفر'}</div>
                        </div>

                        {accountData.phoneNumber && (
                            <div className="view-account-field">
                                <label>الهاتف</label>
                                <div className="view-account-value copyable" onClick={() => navigator.clipboard.writeText(accountData.phoneNumber)}>
                                    {accountData.phoneNumber}
                                    <span className="copy-hint">اضغط للنسخ</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Credentials */}
                    <div className="view-account-section">
                        <div className="view-account-field">
                            <label>البريد الإلكتروني</label>
                            <div className="view-account-value copyable" onClick={() => navigator.clipboard.writeText(accountData.email)} style={{ direction: 'rtl', textAlign: 'right' }}>
                                {accountData.email}
                                <span className="copy-hint">اضغط للنسخ</span>
                            </div>
                        </div>

                        <div className="view-account-field">
                            <label>كلمة المرور</label>
                            <div className="view-account-value copyable password" onClick={() => navigator.clipboard.writeText(accountData.pass)} style={{ direction: 'rtl', textAlign: 'right' }}>
                                {accountData.pass}
                                <span className="copy-hint">اضغط للنسخ</span>
                            </div>
                        </div>
                    </div>

                    {/* Additional Info */}
                    <div className="view-account-section">
                        <div className="view-account-field">
                            <label>تاريخ الميلاد</label>
                            <div className="view-account-value">{accountData.dob}</div>
                        </div>

                        <div className="view-account-field">
                            <label>الرقم التسلسلي</label>
                            <div className="view-account-value mono" style={{ direction: 'rtl', textAlign: 'right' }}>{accountData.sn}</div>
                        </div>

                        {accountData.id && (
                            <div className="view-account-field">
                                <label>معرف الحساب</label>
                                <div className="view-account-value mono small" style={{ direction: 'rtl', textAlign: 'right' }}>{accountData.id}</div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="view-account-footer">
                    <p>🔒 هذه البيانات مشفرة ومحمية من التلاعب.</p>
                    <p>حافظ على سرية هذه المعلومات ولا تشاركها مع الآخرين.</p>
                </div>
            </div>
        </div>
    );
};

export default ViewAccountPage;

