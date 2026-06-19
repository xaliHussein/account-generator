import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { getIdCardByToken, getIdOtp, acceptIdCardTerms, submitIdCardPhone, saveIdCard } from '../services/idApi';
import { getPublicSettings } from '../services/api';
import { Copy, Check, FileText, Image, Video, Lock, Phone, Mail, Key, AlertCircle, CheckCircle, AlertTriangle, Save, Edit3, RefreshCw, MapPin, AtSign, X } from 'lucide-react';
import html2canvas from 'html2canvas';

/**
 * ID Card View Component
 * Public page reached by scanning a card QR (/#/id/:token).
 * Shows the Apple ID account (email / password / phone). Fully Arabic UI.
 * No phone-collection step, no Switch/Edit/Manual, no account-info-card request.
 */
const IdCardView = () => {
    const { token } = useParams();
    const [card, setCard] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [copiedField, setCopiedField] = useState(null);

    // Phone editing
    const [editingPhone, setEditingPhone] = useState(false);
    const [phoneInput, setPhoneInput] = useState('');
    const [phoneSaving, setPhoneSaving] = useState(false);

    // Save (lock) flow
    const [saving, setSaving] = useState(false);
    const [warningModal, setWarningModal] = useState(false);

    // OTP code (fetched from the card's outapi via backend proxy)
    const [otp, setOtp] = useState(null);
    const [otpLoading, setOtpLoading] = useState(false);
    const [otpError, setOtpError] = useState(null);

    // Terms acceptance
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [showTermsModal, setShowTermsModal] = useState(false);
    const [acceptingTerms, setAcceptingTerms] = useState(false);

    // WhatsApp visibility from global settings
    const [showWhatsAppButton, setShowWhatsAppButton] = useState(false);

    // Instructional video (placeholder - can be configured)
    const videoUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

    const otpFetchStartedRef = useRef(false);

    useEffect(() => {
        otpFetchStartedRef.current = false;
    }, [token]);

    useEffect(() => {
        loadCard();
        getPublicSettings()
            .then((data) => setShowWhatsAppButton(data.show_whatsapp_button !== false))
            .catch(() => { });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token]);

    // Defer OTP fetch until terms are accepted to avoid re-renders flashing the terms overlay.
    useEffect(() => {
        if (!termsAccepted || !card?.has_otp || otpFetchStartedRef.current) return;
        otpFetchStartedRef.current = true;
        loadOtp();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [termsAccepted, card?.has_otp, token]);

    const loadCard = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await getIdCardByToken(token);
            setCard(data);
            setTermsAccepted(!data.is_first_scan);
        } catch (err) {
            console.error('Failed to load ID card:', err);
            setError(err.response?.data?.error || 'البطاقة غير موجودة أو الرابط غير صالح');
        } finally {
            setLoading(false);
        }
    };

    const loadOtp = async () => {
        setOtpLoading(true);
        setOtpError(null);
        try {
            const data = await getIdOtp(token);
            setOtp(data.otp);
        } catch (err) {
            setOtpError(err.response?.data?.error || 'تعذر جلب الرمز');
        } finally {
            setOtpLoading(false);
        }
    };

    // Build a clickable URL from a social handle or full link.
    const socialLink = (value, type) => {
        if (!value) return null;
        const v = String(value).trim();
        if (/^https?:\/\//i.test(v)) return v;
        const handle = v.replace(/^@/, '');
        return type === 'instagram' ? `https://instagram.com/${handle}` : `https://www.tiktok.com/@${handle}`;
    };

    const handleCopy = async (field, value) => {
        try {
            await navigator.clipboard.writeText(value);
            setCopiedField(field);
            setTimeout(() => setCopiedField(null), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    const handleSaveAsImage = async () => {
        const element = document.getElementById('id-card-content');
        if (!element) return;
        try {
            const canvas = await html2canvas(element, { backgroundColor: '#0a1628', scale: 2 });
            const link = document.createElement('a');
            link.download = `id-card-${card.serial_number}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        } catch (err) {
            console.error('Failed to save as image:', err);
            setError('فشل في الحفظ كصورة');
        }
    };

    // Phone editing
    const startEditPhone = () => {
        if (card?.is_locked) return;
        setPhoneInput(card.phone_number || '');
        setError(null);
        setEditingPhone(true);
    };

    const cancelEditPhone = () => {
        setEditingPhone(false);
        setPhoneInput('');
    };

    const handleSavePhone = async () => {
        setPhoneSaving(true);
        setError(null);
        try {
            await submitIdCardPhone(token, phoneInput);
            setCard({ ...card, phone_number: phoneInput });
            setEditingPhone(false);
            setSuccess('تم حفظ رقم الهاتف بنجاح');
            setTimeout(() => setSuccess(null), 3000);
        } catch (err) {
            setError(err.response?.data?.error || 'فشل في حفظ رقم الهاتف');
        } finally {
            setPhoneSaving(false);
        }
    };

    // Save (lock) flow
    const confirmSave = () => {
        if (card?.is_locked) return;
        setWarningModal(true);
    };

    const handleSave = async () => {
        setSaving(true);
        setError(null);
        try {
            await saveIdCard(token);
            setCard({ ...card, is_locked: true });
            setWarningModal(false);
            setSuccess('تم حفظ وقفل البطاقة بنجاح');
            setTimeout(() => setSuccess(null), 3000);
        } catch (err) {
            setError(err.response?.data?.error || 'فشل في الحفظ');
            setWarningModal(false);
        } finally {
            setSaving(false);
        }
    };

    const handleAcceptTerms = async () => {
        setAcceptingTerms(true);
        setError(null);
        try {
            await acceptIdCardTerms(token);
            setCard((prev) => (prev ? { ...prev, is_first_scan: false } : prev));
            setTermsAccepted(true);
        } catch (err) {
            setError(err.response?.data?.error || 'فشل في حفظ الموافقة على الشروط');
        } finally {
            setAcceptingTerms(false);
        }
    };

    const renderTermsBody = () => (
        <div className="terms-content">
            <h3>تعليمات إنشاء حساب Apple ID</h3>
           <p>هذا الحساب يستخدم ابل ستوري فقط</p>
            <p>يقوم الزبون بإنشائه بنفسه من جهازه الخاص وبرقم هاتفه، ويتم حفظه هنا.</p>
            <p>احفظ رقمك الشخصي ثم ابدأ بإنشاء الحساب على رقم هاتفك.</p>

            <h3>ملاحظات مهمة:</h3>
            <ol>
                <li>عند تفعيل الايكلود يرجى ايقاف خاصيه العثور على الهاتف .</li>
              <li>ربط الحساب برقم الزبون .</li>
              <li>خلاف ذالك صاحب المحل والتاجر غير مسؤلين عن اي خلل يصيب الهاتف .</li>
            </ol>

            <p>يجب ألا يكون الجهاز قد تم إنشاء حسابات عليه سابقا. في بعض الأحيان تكون هناك هواتف مستعملة تم إنشاء حسابات عليها في وقت سابق، حيث إن شركة Apple ID تعطي سماحًا بعدد معين من الحسابات لكل جهاز لذلك قد يتم حظر الجهاز من قبل شركة Apple ID وتظهر رسالة تعذر إنشاء الحساب، حاول في وقت لاحق. هذه المشكلة لا علاقة لها بالبطاقة، ولكنها تعني أن الجهاز نفسه محظور من إنشاء الحسابات في هذه الحالة قم بتفعيل الحساب على جهاز آخر ثم سجل الدخول إلى جهازك. قم بأخذ لقطة شاشة للحساب والاحتفاظ بها لديك بعد تفعيله.</p>

            <h3>إخلاء مسؤولية:</h3>
           <p>الضمان المقدم يقتصر حصريا على ضمان استبدال بطاقة المحفظة فقط، ولا يشمل أي مسؤولية أخرى متعلقة بحساب Apple ID أو أي أضرار مباشرة أو غير مباشرة قد تلحق بالجهاز لأي سبب كان .</p>

            <p className="terms-final"><strong>يرجى الالتزام بجميع التعليمات، ويُعد استخدامك للمحفظة إقرارًا بموافقتك الكاملة على جميع الشروط والتعليمات المذكورة أعلاه.</strong></p>
        </div>
    );

    const showFirstScanTerms = Boolean(card?.is_first_scan && !termsAccepted);

    if (loading) {
        return (
            <div className="wallet-card-view loading" dir="rtl">
                <div className="spinner"></div>
                <p>جاري التحميل...</p>
            </div>
        );
    }

    if (error && !card) {
        return (
            <div className="wallet-card-view error" dir="rtl">
                <AlertCircle size={48} />
                <h2>خطأ</h2>
                <p>{error}</p>
            </div>
        );
    }

    return (
        <div className="wallet-card-view account-display" dir="rtl">
            {showFirstScanTerms && (
                <div className="wallet-terms-overlay" dir="rtl">
                    <div className="wallet-terms-modal">
                        <h2>الشروط والأحكام</h2>
                        {renderTermsBody()}
                        <button
                            className="btn btn-wallet-primary terms-accept-btn"
                            onClick={handleAcceptTerms}
                            disabled={acceptingTerms}
                        >
                            {acceptingTerms ? 'جاري الحفظ...' : 'موافق'}
                        </button>
                    </div>
                </div>
            )}
            {/* Save Warning Modal */}
            {warningModal && (
                <div className="wallet-warning-overlay" onClick={() => !saving && setWarningModal(false)}>
                    <div className="wallet-warning-modal" dir="rtl" onClick={(e) => e.stopPropagation()}>
                        <div className="warning-icon">
                            <AlertTriangle size={48} />
                        </div>
                        <h3>تحذير</h3>
                        <p>هل أنت متأكد من أنك تريد الحفظ؟ سيتم حفظ معلومات البطاقة ولن تتمكن من إجراء تغييرات.</p>
                        <div className="warning-actions">
                            <button className="btn btn-wallet-secondary" onClick={() => setWarningModal(false)} disabled={saving}>
                                إلغاء
                            </button>
                            <button className="btn btn-wallet-primary" onClick={handleSave} disabled={saving}>
                                {saving ? 'جاري الحفظ...' : 'متابعة'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="wallet-view-container" id="id-card-content">
                {/* Top bar: Terms button */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--spacing-sm)' }}>
                    <button
                        onClick={() => setShowTermsModal(true)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px', fontSize: '13px', fontWeight: 600, borderRadius: '10px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.08)', color: 'white', cursor: 'pointer' }}
                    >
                        <FileText size={15} /> سياسة الاستخدام
                    </button>
                </div>

                {/* Unified header: store branding + Apple ID identity */}
                <div className="wallet-view-header">
                    {card.is_locked && (
                        <div className="locked-badge">
                            <Lock size={14} />
                            مقفل
                        </div>
                    )}

                    {card.show_store_info && card.store && (card.store.logo || card.store.name) && (
                        <>
                            {card.store.logo && (
                                <img src={card.store.logo} alt="logo" style={{ width: 80, height: 80, borderRadius: '20px', objectFit: 'cover', margin: '0 auto 8px', display: 'block' }} />
                            )}
                            {card.store.name && (
                                <div style={{ fontWeight: 700, fontSize: '17px', color: '#fff' }}>{card.store.name}</div>
                            )}
                            <div style={{ height: 1, background: 'rgba(255,255,255,0.18)', width: '70%', margin: '10px auto' }} />
                        </>
                    )}

                    <div style={{ fontSize: '13px', fontWeight: 600, letterSpacing: '1px', color: 'rgba(255,255,255,0.65)', textTransform: 'uppercase' }}>Apple ID</div>
                    <p className="serial-number" style={{ marginTop: '4px' }}>الرقم التسلسلي: {card.serial_number}</p>
                </div>

                {/* Store contact chips */}
                {card.show_store_info && card.store && (card.store.phone || card.store.address || card.store.instagram || card.store.tiktok) && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center', margin: 'var(--spacing-sm) 0 var(--spacing-md)' }}>
                        {card.store.phone && (
                            <a href={`tel:${card.store.phone}`} style={chipStyle}><Phone size={13} /> {card.store.phone}</a>
                        )}
                        {card.store.address && (
                            <span style={chipStyle}><MapPin size={13} /> {card.store.address}</span>
                        )}
                        {card.store.instagram && (
                            <a href={socialLink(card.store.instagram, 'instagram')} target="_blank" rel="noopener noreferrer" style={{ ...chipStyle, color: '#ff7eb3' }}><AtSign size={13} /> Instagram</a>
                        )}
                        {card.store.tiktok && (
                            <a href={socialLink(card.store.tiktok, 'tiktok')} target="_blank" rel="noopener noreferrer" style={chipStyle}><AtSign size={13} /> TikTok</a>
                        )}
                    </div>
                )}

                {success && (
                    <div className="wallet-success">
                        <CheckCircle size={16} />
                        {success}
                    </div>
                )}
                {error && (
                    <div className="wallet-error">
                        <AlertCircle size={16} />
                        {error}
                    </div>
                )}

                {/* Account Fields */}
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '4px 2px 8px' }}>معلومات الحساب</div>
                <div className="wallet-fields">
                    {/* Email */}
                    <div className="wallet-field">
                        <div className="field-icon"><Mail size={18} /></div>
                        <div className="field-content">
                            <label>البريد الإلكتروني</label>
                            <span>{card.email}</span>
                        </div>
                        <button className="copy-btn" onClick={() => handleCopy('email', card.email)}>
                            {copiedField === 'email' ? <Check size={16} /> : <Copy size={16} />}
                        </button>
                    </div>

                    {/* Password */}
                    <div className="wallet-field">
                        <div className="field-icon"><Key size={18} /></div>
                        <div className="field-content">
                            <label>كلمة المرور</label>
                            <span>{card.password}</span>
                        </div>
                        <button className="copy-btn" onClick={() => handleCopy('password', card.password)}>
                            {copiedField === 'password' ? <Check size={16} /> : <Copy size={16} />}
                        </button>
                    </div>

                    {/* OTP Code (from outapi) */}
                    {card.has_otp && (
                        <div className="wallet-field">
                            <div className="field-icon"><Key size={18} /></div>
                            <div className="field-content">
                                <label>رمز التحقق (OTP)</label>
                                {otpLoading ? (
                                    <span style={{ color: 'var(--color-text-secondary)' }}>جاري الجلب...</span>
                                ) : otpError ? (
                                    <span style={{ color: '#ff6b6b' }}>{otpError}</span>
                                ) : (
                                    <span style={{ fontFamily: 'monospace', letterSpacing: '2px', fontSize: '18px' }}>{otp || '—'}</span>
                                )}
                            </div>
                            <button className="copy-btn" onClick={loadOtp} disabled={otpLoading} title="تحديث الرمز" style={{ opacity: otpLoading ? 0.6 : 1 }}>
                                <RefreshCw size={16} className={otpLoading ? 'spin' : ''} />
                            </button>
                            {otp && !otpLoading && !otpError && (
                                <button className="copy-btn" onClick={() => handleCopy('otp', otp)}>
                                    {copiedField === 'otp' ? <Check size={16} /> : <Copy size={16} />}
                                </button>
                            )}
                        </div>
                    )}

                    {/* Phone Number */}
                    <div className="wallet-field">
                        <div className="field-icon"><Phone size={18} /></div>
                        <div className="field-content">
                            <label>رقم الهاتف</label>
                            {editingPhone ? (
                                <input
                                    type="tel"
                                    value={phoneInput}
                                    onChange={(e) => setPhoneInput(e.target.value)}
                                    placeholder="أدخل رقم الهاتف"
                                    dir="rtl"
                                    autoFocus
                                />
                            ) : (
                                <span>{card.phone_number || '—'}</span>
                            )}
                        </div>
                        {editingPhone ? (
                            <>
                                <button
                                    className="copy-btn"
                                    onClick={handleSavePhone}
                                    disabled={phoneSaving}
                                    title="حفظ رقم الهاتف"
                                    style={{ opacity: phoneSaving ? 0.6 : 1 }}
                                >
                                    {phoneSaving ? <RefreshCw size={16} className="spin" /> : <Check size={16} />}
                                </button>
                                <button
                                    className="copy-btn"
                                    onClick={cancelEditPhone}
                                    disabled={phoneSaving}
                                    title="إلغاء"
                                >
                                    <X size={16} />
                                </button>
                            </>
                        ) : (
                            <>
                                {!card.is_locked && (
                                    <button className="copy-btn" onClick={startEditPhone} title="تعديل رقم الهاتف">
                                        <Edit3 size={16} />
                                    </button>
                                )}
                                {card.phone_number && (
                                    <button className="copy-btn" onClick={() => handleCopy('phone', card.phone_number)}>
                                        {copiedField === 'phone' ? <Check size={16} /> : <Copy size={16} />}
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                </div>

                {/* Save Warning Text */}
                {!card.is_locked && !editingPhone && (
                    <div className="wallet-save-warning">
                        <AlertTriangle size={18} />
                        <span>بعد تفعيل الحساب، قم بتغير رقم الهاتف ثم اضغط على زر الحفظ</span>
                    </div>
                )}

                {/* Footer Actions */}
                <div className="wallet-actions-footer" style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px 0' }}>
                    {!card.is_locked && (
                        <button
                            onClick={confirmSave}
                            className="btn btn-wallet-save"
                            disabled={saving || editingPhone}
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '14px 24px', fontSize: '15px', fontWeight: '600', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #00c853, #00a844)', color: 'white', cursor: 'pointer', boxShadow: '0 4px 15px rgba(0, 200, 83, 0.3)', transition: 'all 0.3s ease' }}
                        >
                            <Save size={18} />
                            <span>حفظ</span>
                        </button>
                    )}

                    <button
                        onClick={handleSaveAsImage}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '14px 24px', fontSize: '15px', fontWeight: '600', borderRadius: '12px', border: '2px solid rgba(255,255,255,0.2)', background: 'linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05))', color: 'white', cursor: 'pointer', backdropFilter: 'blur(10px)', transition: 'all 0.3s ease' }}
                    >
                        <Image size={18} />
                        <span>حفظ كصورة</span>
                    </button>

                    <a
                        href={videoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '14px 24px', fontSize: '15px', fontWeight: '600', borderRadius: '12px', border: '2px solid rgba(255,255,255,0.2)', background: 'linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05))', color: 'white', cursor: 'pointer', backdropFilter: 'blur(10px)', textDecoration: 'none', transition: 'all 0.3s ease' }}
                    >
                        <Video size={18} />
                        <span>فيديو تعليمي</span>
                    </a>

                    {showWhatsAppButton && (
                        <a
                            href="https://wa.me/9647707771235"
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '14px 24px', fontSize: '15px', fontWeight: '600', borderRadius: '12px', border: '2px solid rgba(37,211,102,0.4)', background: 'rgba(37,211,102,0.15)', color: '#25D366', cursor: 'pointer', backdropFilter: 'blur(10px)', transition: 'all 0.3s ease', textDecoration: 'none' }}
                        >
                            <svg viewBox="0 0 24 24" width="20" height="20" fill="#25D366">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                            </svg>
                            <span>تواصل عبر واتساب</span>
                        </a>
                    )}
                </div>

                {/* Reusable Terms Modal */}
                {showTermsModal && (
                    <div className="wallet-terms-overlay" dir="rtl" style={{ zIndex: 1000 }}>
                        <div className="wallet-terms-modal" style={{ position: 'relative' }}>
                            <button
                                type="button"
                                onClick={() => setShowTermsModal(false)}
                                style={{ position: 'absolute', top: '16px', left: '16px', background: 'rgba(0,0,0,0.1)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#333', fontSize: '18px', fontWeight: 'bold', zIndex: 10 }}
                            >
                                ✕
                            </button>
                            <h2>الشروط والأحكام</h2>
                            {renderTermsBody()}
                            <div style={{ padding: '0 16px 20px', display: 'flex', justifyContent: 'center' }}>
                                <button
                                    onClick={() => setShowTermsModal(false)}
                                    style={{ background: '#0088CC', marginTop: '10px', width: '100%', border: 'none', padding: '12px', borderRadius: '8px', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}
                                >
                                    إغلاق
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Print Date */}
                <div className="wallet-print-date">
                    تاريخ الطباعة: {new Date().toLocaleDateString('en-CA')}
                </div>
            </div>
        </div>
    );
};

const chipStyle = { display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '5px 12px', borderRadius: '999px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.14)', color: 'rgba(255,255,255,0.9)', fontSize: '12px', textDecoration: 'none' };

export default IdCardView;
