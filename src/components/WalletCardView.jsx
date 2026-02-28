import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
    getWalletCardByToken,
    submitWalletCardPhone,
    switchWalletCard,
    editWalletCard,
    manualFillWalletCard,
    saveWalletCard,
    submitCardRequest,
    checkExistingRequest
} from '../services/walletApi';
import {
    Copy, Check, RefreshCw, Edit3, FileText, Save, Image, Video,
    Lock, Phone, Calendar, Mail, User, Key, AlertCircle, CheckCircle, AlertTriangle
} from 'lucide-react';
import html2canvas from 'html2canvas';
import QRCode from 'react-qr-code';

/**
 * Wallet Card View Component
 * Public page for QR scan - phone collection and account display
 * Fully Arabic UI
 */
const WalletCardView = () => {
    const { token } = useParams();
    const [card, setCard] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    // Phone collection
    const [phoneNumber, setPhoneNumber] = useState('');
    const [submittingPhone, setSubmittingPhone] = useState(false);

    // Edit mode
    const [editMode, setEditMode] = useState(false);
    const [manualMode, setManualMode] = useState(false);
    const [editData, setEditData] = useState({});

    // Action states
    const [actionLoading, setActionLoading] = useState(false);
    const [copiedField, setCopiedField] = useState(null);

    // Warning modal state
    const [warningModal, setWarningModal] = useState({ show: false, type: '', message: '' });

    // Account Info Card modal state (for locked cards)
    const [accountInfoModal, setAccountInfoModal] = useState(false);
    const [requestSubmitting, setRequestSubmitting] = useState(false);
    const [requestSuccess, setRequestSuccess] = useState(false);
    const [existingRequest, setExistingRequest] = useState(null);
    const [checkingExisting, setCheckingExisting] = useState(false);

    // Card design selection for request
    const [selectedCardDesign, setSelectedCardDesign] = useState('classic');

    // Terms acceptance state
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [showTermsModal, setShowTermsModal] = useState(false);

    // Color definitions matching the card colors
    const CARD_COLORS = {
        blue: '#0088CC',
        black: '#1E1E1E'
    };
    const headerColor = card ? (CARD_COLORS[card.color] || CARD_COLORS.blue) : CARD_COLORS.blue;
    const isApple = card?.email ? (card.email.toLowerCase().includes('@icloud.com') || card.email.toLowerCase().includes('@me.com') || card.email.toLowerCase().includes('@mac.com')) : true;

    // Video URL (placeholder - can be configured)
    const videoUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'; // Replace with actual video

    useEffect(() => {
        loadCard();
    }, [token]);

    const loadCard = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await getWalletCardByToken(token);
            setCard(data);
            setEditData({
                email: data.email,
                password: data.password,
                first_name: data.first_name,
                last_name: data.last_name,
                birthday: data.birthday,
                phone_number: data.phone_number || '',
            });
        } catch (err) {
            console.error('Failed to load card:', err);
            setError('البطاقة غير موجودة أو الرابط غير صالح');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmitPhone = async (e) => {
        e.preventDefault();
        if (!phoneNumber.trim()) return;

        setSubmittingPhone(true);
        setError(null);
        try {
            await submitWalletCardPhone(token, phoneNumber);
            await loadCard();
            setSuccess('تم حفظ رقم الهاتف بنجاح');
            setTimeout(() => setSuccess(null), 3000);
        } catch (err) {
            setError(err.response?.data?.error || 'فشل في حفظ رقم الهاتف');
        } finally {
            setSubmittingPhone(false);
        }
    };

    // Show warning before Switch
    const confirmSwitch = () => {
        setWarningModal({
            show: true,
            type: 'switch',
            message: 'سيتم تغيير جميع البيانات إلى بيانات عشوائية جديدة. هل أنت متأكد؟'
        });
    };

    // Show warning before Edit
    const confirmEdit = () => {
        setWarningModal({
            show: true,
            type: 'edit',
            message: 'سيتم تفعيل وضع التعديل. يمكنك تغيير البيانات الحالية.'
        });
    };

    // Show warning before Manual Fill
    const confirmManualFill = () => {
        setWarningModal({
            show: true,
            type: 'manual',
            message: 'سيتم مسح جميع البيانات الحالية. ستحتاج إلى إدخال البيانات يدوياً.'
        });
    };

    // Show warning before Save
    const confirmSave = () => {
        if (card.is_locked) return;
        setWarningModal({
            show: true,
            type: 'save',
            message: 'هل أنت متأكد من أنك تريد الحفظ؟ سيتم حفظ معلومات البطاقة ولن تتمكن من إجراء تغييرات.'
        });
    };

    // Execute action after warning confirmation
    const executeWarningAction = async () => {
        const type = warningModal.type;
        setWarningModal({ show: false, type: '', message: '' });

        if (type === 'switch') {
            await handleSwitch();
        } else if (type === 'edit') {
            setEditMode(true);
            setManualMode(false);
        } else if (type === 'manual') {
            startManualMode();
        } else if (type === 'save') {
            await handleSave();
        }
    };

    const handleSwitch = async () => {
        if (card.is_locked) return;
        setActionLoading(true);
        setError(null);
        try {
            const data = await switchWalletCard(token);
            setCard({ ...card, ...data });
            setEditData({
                email: data.email,
                password: data.password,
                first_name: data.first_name,
                last_name: data.last_name,
                birthday: data.birthday,
                phone_number: card.phone_number,
            });
            setSuccess('تم تجديد بيانات الحساب');
            setTimeout(() => setSuccess(null), 3000);
        } catch (err) {
            setError(err.response?.data?.error || 'فشل في تبديل البيانات');
        } finally {
            setActionLoading(false);
        }
    };

    const handleEdit = async () => {
        if (card.is_locked) return;
        setActionLoading(true);
        setError(null);
        try {
            const data = await editWalletCard(token, editData);
            setCard({ ...card, ...data });
            setEditMode(false);
            setSuccess('تم حفظ التغييرات بنجاح');
            setTimeout(() => setSuccess(null), 3000);
        } catch (err) {
            setError(err.response?.data?.error || 'فشل في حفظ التغييرات');
        } finally {
            setActionLoading(false);
        }
    };

    const handleManualFill = async () => {
        if (card.is_locked) return;
        setActionLoading(true);
        setError(null);
        try {
            const data = await manualFillWalletCard(token, editData);
            setCard({ ...card, ...data });
            setManualMode(false);
            setSuccess('تم حفظ البيانات بنجاح');
            setTimeout(() => setSuccess(null), 3000);
        } catch (err) {
            setError(err.response?.data?.error || 'فشل في الحفظ');
        } finally {
            setActionLoading(false);
        }
    };

    const handleSave = async () => {
        if (card.is_locked) return;
        // logic moved to confirmSave -> executeWarningAction -> handleSave
        setActionLoading(true);
        setError(null);
        try {
            await saveWalletCard(token);
            setCard({ ...card, is_locked: true });
            setSuccess('تم حفظ وقفل البطاقة بنجاح');
            setTimeout(() => setSuccess(null), 3000);
        } catch (err) {
            setError(err.response?.data?.error || 'فشل في الحفظ');
        } finally {
            setActionLoading(false);
        }
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
        const element = document.getElementById('wallet-card-content');
        if (!element) return;

        try {
            const canvas = await html2canvas(element, {
                backgroundColor: '#0a1628',
                scale: 2,
            });
            const link = document.createElement('a');
            link.download = `wallet-card-${card.serial_number}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        } catch (err) {
            console.error('Failed to save as image:', err);
            setError('فشل في الحفظ كصورة');
        }
    };

    const startManualMode = () => {
        setManualMode(true);
        setEditMode(false);
        setEditData({
            email: '',
            password: '',
            first_name: '',
            last_name: '',
            birthday: '',
            phone_number: card.phone_number || '',
        });
    };

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

    // Warning Modal Component
    const WarningModal = () => {
        if (!warningModal.show) return null;

        return (
            <div className="wallet-warning-overlay" onClick={() => setWarningModal({ show: false, type: '', message: '' })}>
                <div className="wallet-warning-modal" dir="rtl" onClick={(e) => e.stopPropagation()}>
                    <div className="warning-icon">
                        <AlertTriangle size={48} />
                    </div>
                    <h3>تحذير</h3>
                    <p>{warningModal.message}</p>
                    <div className="warning-actions">
                        <button
                            className="btn btn-wallet-secondary"
                            onClick={() => setWarningModal({ show: false, type: '', message: '' })}
                        >
                            إلغاء
                        </button>
                        <button
                            className="btn btn-wallet-primary"
                            onClick={executeWarningAction}
                        >
                            متابعة
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    // Terms Modal Component
    const TermsModal = () => {
        if (termsAccepted) return null;

        return (
            <div className="wallet-terms-overlay" dir="rtl">
                <div className="wallet-terms-modal">
                    <h2>الشروط والأحكام</h2>
                    <div className="terms-content">
                        <h3>تعليمات إنشاء حساب {card.wallet_type === 'google' ? 'Google Play' : 'Apple ID'}</h3>
                        <p>هذا الكارت هو محفظة لتخزين حساب الـ {card.wallet_type === 'google' ? 'Google Play' : 'Apple ID'}</p>
                        <p>يقوم الزبون بإنشائه بنفسه من جهازه الخاص وبرقم هاتفه، ويتم حفظه هنا.</p>
                        <p>احفظ رقمك الشخصي ثم ابدأ بإنشاء الحساب على رقم هاتفك.</p>

                        <h3>ملاحظات مهمة:</h3>
                        <ol>
                            <li>يجب استعمال رقم هاتف لم يستعمل سابقا في تفعيل حساب {card.wallet_type === 'google' ? 'Google Play' : 'Apple ID'}</li>
                            <li>يتم حفظ معلومات الحساب في نظامنا 3 سنوات بعدها غير مسؤلين عن فقدان المعلومات بعد 3 سنوات من تفعيل الحساب.</li>
                            <li>يمكنك طلب بطاقة خاصه تتضمن معلومات حسابك عند تفعيل حسابك.</li>
                        </ol>

                        <p>يجب ألا يكون الجهاز قد تم إنشاء حسابات عليه سابقا. في بعض الأحيان تكون هناك هواتف مستعملة تم إنشاء حسابات عليها في وقت سابق، حيث إن شركة {card.wallet_type === 'google' ? 'Google Play' : 'Apple ID'} تعطي سماحًا بعدد معين من الحسابات لكل جهاز لذلك قد يتم حظر الجهاز من قبل شركة {card.wallet_type === 'google' ? 'Google Play' : 'Apple ID'} وتظهر رسالة تعذر إنشاء الحساب، حاول في وقت لاحق. هذه المشكلة لا علاقة لها بالبطاقة، ولكنها تعني أن الجهاز نفسه محظور من إنشاء الحسابات في هذه الحالة قم بتفعيل الحساب على جهاز آخر ثم سجل الدخول إلى جهازك. قم بأخذ لقطة شاشة للحساب والاحتفاظ بها لديك بعد تفعيله.</p>

                        <h3>إخلاء مسؤولية:</h3>
                        <p>الضمان المقدم يقتصر حصريا على ضمان استبدال بطاقة المحفظة فقط، ولا يشمل أي مسؤولية أخرى متعلقة بحساب {card.wallet_type === 'google' ? 'Google Play' : 'Apple ID'} أو أي أضرار مباشرة أو غير مباشرة قد تلحق بالجهاز لأي سبب كان. نحن لا نبيع حساب {card.wallet_type === 'google' ? 'Google Play' : 'Apple ID'}، وإنما نبيع بطاقة محفظة مخصصة لتخزين الحساب الذي يقوم الزبون بإنشائه بنفسه وباستخدام جهازه ورقم هاتفه الشخصي. في الوضع الطبيعي إن إنشاء الحساب يدويا وبشكل مباشر وبرقم هاتف الزبون يُعد حسابًا رسميا وأصوليا صالحًا لاستخدامه كحساب iCloud و {card.wallet_type === 'google' ? 'Google Play' : 'Apple ID'}. ومع ذلك، قد تطرأ في أي وقت أخطاء أو مشكلات داخل أنظمة شركة {card.wallet_type === 'google' ? 'Google Play' : 'Apple ID'}، دون أسباب واضحة، قد تؤدي إلى تعطيل الوصول إلى بعض الخدمات أو التسبب بأضرار، وقد صرحت شركة {card.wallet_type === 'google' ? 'Google Play' : 'Apple ID'} بذلك صراحة ضمن شروط استخدام خدماتها. وبمجرد استخدام أي من خدمات أو منتجات {card.wallet_type === 'google' ? 'Google Play' : 'Apple ID'}، فإن المستخدم يقر ويتحمل كامل المسؤولية عن ذلك وحده. وعليه فإن البائع يخلي مسؤوليته بالكامل وينتهي التزامه عند تسليم بطاقة المحفظة للزبون.</p>

                        <p className="terms-final"><strong>يرجى الالتزام بجميع التعليمات، ويُعد استخدامك للمحفظة إقرارًا بموافقتك الكاملة على جميع الشروط والتعليمات المذكورة أعلاه.</strong></p>
                    </div>
                    <button
                        className="btn btn-wallet-primary terms-accept-btn"
                        onClick={() => setTermsAccepted(true)}
                    >
                        موافق
                    </button>
                </div>
            </div>
        );
    };

    // Check for existing request (called when modal opens)
    const checkForExistingRequest = async () => {
        if (card?.id) {
            setCheckingExisting(true);
            try {
                const result = await checkExistingRequest(card.id);
                setExistingRequest(result.exists ? result : null);
            } catch (err) {
                console.error('Failed to check existing request:', err);
                setExistingRequest(null);
            } finally {
                setCheckingExisting(false);
            }
        }
    };

    // Open account info modal
    const openAccountInfoModal = async () => {
        setAccountInfoModal(true);
        setExistingRequest(null);
        setCheckingExisting(true);
        try {
            const result = await checkExistingRequest(card.id);
            setExistingRequest(result.exists ? result : null);
        } catch (err) {
            console.error('Failed to check existing request:', err);
            setExistingRequest(null);
        } finally {
            setCheckingExisting(false);
        }
    };

    // Account Info Card Modal Component (Arabic UI)
    const AccountInfoCardModal = () => {
        if (!accountInfoModal) return null;

        const handleSubmitRequest = async () => {
            if (existingRequest) return; // Prevent duplicate submission
            setRequestSubmitting(true);
            try {
                await submitCardRequest(card.id, selectedCardDesign);
                setRequestSuccess(true);
                setExistingRequest({ exists: true, status: 'pending' });
            } catch (err) {
                console.error('Failed to submit card request:', err);
                setError(err.response?.data?.error || 'فشل في إرسال الطلب');
                setAccountInfoModal(false);
            } finally {
                setRequestSubmitting(false);
            }
        };

        return (
            <div className="wallet-warning-overlay" onClick={() => !requestSubmitting && setAccountInfoModal(false)}>
                <div className="wallet-account-info-modal" dir="rtl" onClick={(e) => e.stopPropagation()}>
                    {requestSuccess ? (
                        // Success Screen
                        <div className="account-info-success">
                            <div className="success-icon">
                                <CheckCircle size={64} style={{ color: '#00c853' }} />
                            </div>
                            <h3>تم إرسال الطلب بنجاح!</h3>
                            <p>سيتم التواصل معك عبر واتساب لإتمام طلب البطاقة.</p>
                            <button
                                className="btn btn-wallet-primary"
                                onClick={() => {
                                    setAccountInfoModal(false);
                                    setRequestSuccess(false);
                                }}
                            >
                                حسناً
                            </button>
                        </div>
                    ) : existingRequest ? (
                        // Already Submitted Screen
                        <div className="account-info-success">
                            <div className="success-icon">
                                <AlertTriangle size={64} style={{ color: '#ff9800' }} />
                            </div>
                            <h3>تم إرسال طلب مسبقاً</h3>
                            <p>لقد قمت بإرسال طلب للحصول على بطاقة مطبوعة سابقاً.</p>
                            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                                حالة الطلب: <strong>{existingRequest.status === 'pending' ? 'قيد الانتظار' : existingRequest.status === 'processing' ? 'جاري المعالجة' : existingRequest.status}</strong>
                            </p>
                            <button
                                className="btn btn-wallet-primary"
                                onClick={() => setAccountInfoModal(false)}
                            >
                                حسناً
                            </button>
                        </div>
                    ) : checkingExisting ? (
                        // Loading check
                        <div className="account-info-success">
                            <div className="spinner" style={{ margin: '20px auto' }}></div>
                            <p>جاري التحقق...</p>
                        </div>
                    ) : (
                        // Request Form
                        <>
                            <div className="account-info-header">
                                <FileText size={32} style={{ color: '#00c8ff' }} />
                                <h3>إنشاء بطاقة معلومات الحساب</h3>
                            </div>

                            <div className="account-info-notice">
                                <AlertCircle size={18} />
                                <p>للحصول على بطاقة مطبوعة تحتوي على معلومات حسابك الكاملة، يرجى التواصل معنا عبر واتساب.</p>
                            </div>

                            <div className="whatsapp-contact">
                                <a href="https://wa.me/9647707771235" target="_blank" rel="noopener noreferrer" className="whatsapp-link">
                                    <svg viewBox="0 0 24 24" width="24" height="24" fill="#25D366">
                                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                                    </svg>
                                    تواصل عبر واتساب
                                </a>
                            </div>

                            {/* Card Design Selector */}
                            <div style={{ marginBottom: '12px' }}>
                                <div className="preview-title" style={{ textAlign: 'center', marginBottom: '8px', color: 'rgba(255,255,255,0.8)', fontSize: '14px', fontWeight: '600' }}>اختر تصميم البطاقة</div>
                                <div className="card-design-selector">
                                    {/* Classic Dark Design */}
                                    <div
                                        className={`card-design-option ${selectedCardDesign === 'classic' ? 'selected' : ''}`}
                                        onClick={() => setSelectedCardDesign('classic')}
                                    >
                                        <div className="design-preview">
                                            <div className="wallet-card-front" style={{ transform: 'scale(1)', width: '355px', height: '200px' }}>
                                                <div className="wallet-card-circuits wallet-circuits-left"></div>
                                                <div className="wallet-card-circuits wallet-circuits-right"></div>
                                                <div className="wallet-card-content">
                                                    <div className="wallet-card-branding">
                                                        <div className="wallet-card-icon" style={{ width: '28px', height: '28px', marginBottom: '4px' }}>
                                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                                                <rect x="2" y="6" width="20" height="12" rx="2" />
                                                                <path d="M22 10H2" />
                                                                <circle cx="18" cy="14" r="1.5" fill="currentColor" />
                                                            </svg>
                                                        </div>
                                                        <h2 className="wallet-card-title" style={{ fontSize: '10px' }}>{card.email_type === 'google' ? 'Google Wallet' : 'Apple Wallet'}</h2>
                                                    </div>
                                                </div>
                                                <div className="wallet-card-diamond"></div>
                                            </div>
                                        </div>
                                        <div className="design-label">كلاسيك</div>
                                        <div className="design-sublabel">التصميم الداكن</div>
                                    </div>

                                    {/* Light Off-White Design */}
                                    <div
                                        className={`card-design-option ${selectedCardDesign === 'light' ? 'selected' : ''}`}
                                        onClick={() => setSelectedCardDesign('light')}
                                    >
                                        <div className="design-preview">
                                            <div className="wallet-card-front-light" style={{ transform: 'scale(1)', width: '355px', height: '200px' }}>
                                                <div className="wallet-light-accent-line wallet-light-accent-top"></div>
                                                <div className="wallet-light-accent-line wallet-light-accent-bottom"></div>
                                                <div className="wallet-card-content-light">
                                                    <div className="wallet-card-branding-light">
                                                        <div className="wallet-card-icon-light" style={{ width: '28px', height: '28px', marginBottom: '4px' }}>
                                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                                                <rect x="2" y="6" width="20" height="12" rx="2" />
                                                                <path d="M22 10H2" />
                                                                <circle cx="18" cy="14" r="1.5" fill="currentColor" />
                                                            </svg>
                                                        </div>
                                                        <h2 className="wallet-card-title-light" style={{ fontSize: '10px' }}>{card.email_type === 'google' ? 'Google Wallet' : 'Apple Wallet'}</h2>
                                                    </div>
                                                </div>
                                                <div className="wallet-card-corner-light"></div>
                                            </div>
                                        </div>
                                        <div className="design-label">أنيق</div>
                                        <div className="design-sublabel">التصميم الفاتح</div>
                                    </div>
                                </div>
                            </div>

                            {/* Card Preview based on selected design */}
                            <div className="account-card-preview">
                                <div className="preview-title">معاينة البطاقة</div>
                                {selectedCardDesign === 'light' ? (
                                    // Light design preview
                                    <div className="wallet-card-front-light" style={{ transform: 'scale(0.99)', transformOrigin: 'center', margin: 'auto' }}>
                                        <div className="wallet-light-accent-line wallet-light-accent-top"></div>
                                        <div className="wallet-light-accent-line wallet-light-accent-bottom"></div>
                                        <div className="wallet-card-content-light">
                                            <div className="wallet-card-branding-light" style={{ justifyContent: 'flex-start', paddingTop: '8px' }}>
                                                <div className="wallet-card-icon-light" style={{ width: '32px', height: '32px', marginBottom: '6px' }}>
                                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                                        <rect x="2" y="6" width="20" height="12" rx="2" />
                                                        <path d="M22 10H2" />
                                                        <circle cx="18" cy="14" r="1.5" fill="currentColor" />
                                                    </svg>
                                                </div>
                                                <h2 className="wallet-card-title-light" style={{ fontSize: '12px', marginBottom: '2px' }}>{card.email_type === 'google' ? 'Google Wallet' : 'Apple Wallet'}</h2>
                                                <div className="wallet-card-titlear-light" dir="rtl" style={{ fontFamily: 'Arial, sans-serif', unicodeBidi: 'embed', fontSize: '10px', marginBottom: '6px' }}>
                                                    {card.email_type === 'google' ? 'محفظة جوجل' : 'محفظة أبل'}
                                                </div>
                                                <div style={{ width: '100%', fontSize: '8px', color: '#4A4A4A', textAlign: 'left', lineHeight: '1.3' }}>
                                                    <div style={{ marginBottom: '2px' }}>
                                                        <span style={{ color: '#B8860B' }}>Name:</span> {card.first_name} {card.last_name}
                                                    </div>
                                                    <div style={{ marginBottom: '2px', wordBreak: 'break-all', textAlign: 'left', direction: 'ltr' }}>
                                                        <span style={{ color: '#B8860B' }}>Email:</span>  {card.email.length > 14 ? `${card.email.slice(0, 14)}...` : card.email}
                                                    </div>
                                                    <div style={{ marginBottom: '2px' }}>
                                                        <span style={{ color: '#B8860B' }}>Pass:</span> <span style={{ fontWeight: 'bold' }}>{card.password}</span>
                                                    </div>
                                                    <div style={{ marginBottom: '2px' }}>
                                                        <span style={{ color: '#B8860B' }}>DOB:</span> {new Date(card.birthday).toLocaleDateString('en-CA') || 'N/A'}
                                                    </div>
                                                    <div className="wallet-card-serial-light" dir="rtl" style={{ fontFamily: 'Arial, sans-serif', unicodeBidi: 'embed', fontSize: '8px', marginTop: '4px' }}>
                                                        Serial No: {card.serial_number || 'N/A'}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="wallet-card-qr-section-light">
                                                <div className="wallet-card-scan-text-light" dir="rtl" style={{ fontFamily: 'Arial, sans-serif', unicodeBidi: 'embed' }}>
                                                    امسح هنا
                                                </div>
                                                <div className="wallet-card-qr-container-light">
                                                    <QRCode value={`${window.location.origin}/#/wallet/${card.access_token}`} size={110} level="M" bgColor="#FAF8F5" fgColor="#2C2C2C" />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="wallet-card-corner-light"></div>
                                    </div>
                                ) : (
                                    // Classic dark design preview (original)
                                    <div className="wallet-card-front" style={{ transform: 'scale(0.99)', transformOrigin: 'center', margin: 'auto' }}>
                                        <div className="wallet-card-circuits wallet-circuits-left"></div>
                                        <div className="wallet-card-circuits wallet-circuits-right"></div>
                                        <div className="wallet-card-content">
                                            <div className="wallet-card-branding" style={{ justifyContent: 'flex-start', paddingTop: '8px' }}>
                                                <div className="wallet-card-icon" style={{ width: '32px', height: '32px', marginBottom: '6px' }}>
                                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                                        <rect x="2" y="6" width="20" height="12" rx="2" />
                                                        <path d="M22 10H2" />
                                                        <circle cx="18" cy="14" r="1.5" fill="currentColor" />
                                                    </svg>
                                                </div>
                                                <h2 className="wallet-card-title" style={{ fontSize: '12px', marginBottom: '2px' }}>{card.email_type === 'google' ? 'Google Wallet' : 'Apple Wallet'}</h2>
                                                <div className="wallet-card-title-ar" dir="rtl" style={{ fontFamily: 'Arial, sans-serif', unicodeBidi: 'embed', fontSize: '10px', marginBottom: '6px' }}>
                                                    {card.email_type === 'google' ? 'محفظة جوجل' : 'محفظة أبل'}
                                                </div>
                                                <div style={{ width: '100%', fontSize: '8px', color: 'rgba(255,255,255,0.9)', textAlign: 'left', lineHeight: '1.3' }}>
                                                    <div style={{ marginBottom: '2px' }}>
                                                        <span style={{ color: '#00c8ff' }}>Name:</span> {card.first_name} {card.last_name}
                                                    </div>
                                                    <div style={{ marginBottom: '2px', wordBreak: 'break-all', textAlign: 'left', direction: 'ltr' }}>
                                                        <span style={{ color: '#00c8ff' }}>Email:</span>  {card.email.length > 14 ? `${card.email.slice(0, 14)}...` : card.email}
                                                    </div>
                                                    <div style={{ marginBottom: '2px' }}>
                                                        <span style={{ color: '#00c8ff' }}>Pass:</span> <span style={{ fontWeight: 'bold' }}>{card.password}</span>
                                                    </div>
                                                    <div style={{ marginBottom: '2px' }}>
                                                        <span style={{ color: '#00c8ff' }}>DOB:</span> {card.birthday || 'N/A'}
                                                    </div>
                                                    <div className="wallet-card-serial-2" dir="rtl" style={{ fontFamily: 'Arial, sans-serif', unicodeBidi: 'embed', fontSize: '8px', marginTop: '4px' }}>
                                                        Serial No: {card.serial_number || 'N/A'}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="wallet-card-qr-section">
                                                <div className="wallet-card-scan-text" dir="rtl" style={{ fontFamily: 'Arial, sans-serif', unicodeBidi: 'embed' }}>
                                                    امسح هنا
                                                </div>
                                                <div className="wallet-card-qr-container">
                                                    <QRCode value={`${window.location.origin}/#/wallet/${card.access_token}`} size={110} level="M" bgColor="#FFFFFF" fgColor="#000000" />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="wallet-card-diamond"></div>
                                    </div>
                                )}
                            </div>

                            <div className="account-info-actions">
                                <button
                                    className="btn btn-wallet-secondary"
                                    onClick={() => setAccountInfoModal(false)}
                                    disabled={requestSubmitting}
                                >
                                    إلغاء
                                </button>
                                <button
                                    className="btn btn-wallet-primary"
                                    onClick={handleSubmitRequest}
                                    disabled={requestSubmitting}
                                >
                                    {requestSubmitting ? 'جاري الإرسال...' : 'إرسال الطلب'}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        );
    };

    // Phase 1: Phone Collection
    if (!card.phone_collected) {
        return (
            <div className="wallet-card-view phone-collection" dir="rtl">
                <TermsModal />
                <WarningModal />
                <div className="wallet-view-container">
                    <div className="wallet-view-header">
                        <div className="wallet-view-icon">
                            <Phone size={32} />
                        </div>
                        <h1>{card.wallet_type === 'google' ? 'محفظة Google' : 'محفظة Apple'}</h1>
                        <p>أدخل رقم الهاتف للمتابعة</p>
                    </div>

                    <form onSubmit={handleSubmitPhone} className="phone-form">
                        <div className="form-group">
                            <label>رقم الهاتف</label>
                            <input
                                type="tel"
                                value={phoneNumber}
                                onChange={(e) => setPhoneNumber(e.target.value)}
                                placeholder="أدخل رقم هاتفك"
                                required
                                autoFocus
                                dir="rtl"
                            />
                        </div>

                        {error && (
                            <div className="wallet-error">
                                <AlertCircle size={16} />
                                {error}
                            </div>
                        )}

                        <button type="submit" className="btn btn-wallet-primary" disabled={submittingPhone}>
                            {submittingPhone ? 'جاري الحفظ...' : 'متابعة'}
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    // Phase 2: Account Display
    return (
        <div className="wallet-card-view account-display" dir="rtl">
            <WarningModal />
            <AccountInfoCardModal />
            <div className="wallet-view-container" id="wallet-card-content">
                {/* Header with lock status */}
                <div className="wallet-view-header">
                    {card.is_locked && (
                        <div className="locked-badge">
                            <Lock size={14} />
                            مقفل
                        </div>
                    )}
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#fff' }}>
                        {card.wallet_type === 'google' ? 'محفظة Google' : 'محفظة Apple'}
                    </div>
                    <p className="serial-number">الرقم التسلسلي: {card.serial_number}</p>
                </div>

                {/* Success/Error Messages */}
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

                {/* Action Buttons - Top */}
                {!card.is_locked && (
                    <div className="wallet-actions-top">
                        <button
                            onClick={confirmSwitch}
                            className="btn btn-wallet-action"
                            disabled={actionLoading || editMode || manualMode}
                            title="تجديد جميع البيانات ببيانات عشوائية جديدة"
                        >
                            <RefreshCw size={16} />
                            تبديل
                        </button>
                        <button
                            onClick={confirmEdit}
                            className={`btn btn-wallet-action ${editMode ? 'active' : ''}`}
                            disabled={actionLoading || manualMode}
                            title="تعديل البيانات"
                        >
                            <Edit3 size={16} />
                            تعديل
                        </button>
                        <button
                            onClick={confirmManualFill}
                            className={`btn btn-wallet-action ${manualMode ? 'active' : ''}`}
                            disabled={actionLoading || editMode}
                            title="مسح الكل وإدخال يدوي"
                        >
                            <FileText size={16} />
                            إدخال يدوي
                        </button>
                    </div>
                )}

                {/* Account Fields */}
                <div className="wallet-fields">
                    {/* Email */}
                    <div className="wallet-field">
                        <div className="field-icon"><Mail size={18} /></div>
                        <div className="field-content">
                            <label>البريد الإلكتروني</label>
                            {editMode || manualMode ? (
                                <input
                                    type="email"
                                    value={editData.email}
                                    onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                                    placeholder="أدخل البريد الإلكتروني"
                                />
                            ) : (
                                <span>{card.email}</span>
                            )}
                        </div>
                        {!editMode && !manualMode && (
                            <button className="copy-btn" onClick={() => handleCopy('email', card.email)}>
                                {copiedField === 'email' ? <Check size={16} /> : <Copy size={16} />}
                            </button>
                        )}
                    </div>

                    {/* Password */}
                    <div className="wallet-field">
                        <div className="field-icon"><Key size={18} /></div>
                        <div className="field-content">
                            <label>كلمة المرور</label>
                            {editMode || manualMode ? (
                                <input
                                    type="text"
                                    value={editData.password}
                                    onChange={(e) => setEditData({ ...editData, password: e.target.value })}
                                    placeholder="أدخل كلمة المرور"
                                />
                            ) : (
                                <span>{card.password}</span>
                            )}
                        </div>
                        {!editMode && !manualMode && (
                            <button className="copy-btn" onClick={() => handleCopy('password', card.password)}>
                                {copiedField === 'password' ? <Check size={16} /> : <Copy size={16} />}
                            </button>
                        )}
                    </div>

                    {/* First Name */}
                    <div className="wallet-field">
                        <div className="field-icon"><User size={18} /></div>
                        <div className="field-content">
                            <label>الاسم الأول</label>
                            {editMode || manualMode ? (
                                <input
                                    type="text"
                                    value={editData.first_name}
                                    onChange={(e) => setEditData({ ...editData, first_name: e.target.value })}
                                    placeholder="أدخل الاسم الأول"
                                />
                            ) : (
                                <span>{card.first_name}</span>
                            )}
                        </div>
                        {!editMode && !manualMode && (
                            <button className="copy-btn" onClick={() => handleCopy('first_name', card.first_name)}>
                                {copiedField === 'first_name' ? <Check size={16} /> : <Copy size={16} />}
                            </button>
                        )}
                    </div>

                    {/* Last Name */}
                    <div className="wallet-field">
                        <div className="field-icon"><User size={18} /></div>
                        <div className="field-content">
                            <label>الاسم الأخير</label>
                            {editMode || manualMode ? (
                                <input
                                    type="text"
                                    value={editData.last_name}
                                    onChange={(e) => setEditData({ ...editData, last_name: e.target.value })}
                                    placeholder="أدخل الاسم الأخير"
                                />
                            ) : (
                                <span>{card.last_name}</span>
                            )}
                        </div>
                        {!editMode && !manualMode && (
                            <button className="copy-btn" onClick={() => handleCopy('last_name', card.last_name)}>
                                {copiedField === 'last_name' ? <Check size={16} /> : <Copy size={16} />}
                            </button>
                        )}
                    </div>

                    {/* Birthday */}
                    <div className="wallet-field">
                        <div className="field-icon"><Calendar size={18} /></div>
                        <div className="field-content">
                            <label>تاريخ الميلاد</label>
                            {editMode || manualMode ? (
                                <input
                                    type="date"
                                    value={editData.birthday}
                                    onChange={(e) => setEditData({ ...editData, birthday: e.target.value })}
                                    dir="rtl"
                                />
                            ) : (
                                <span>{card.birthday}</span>
                            )}
                        </div>
                        {!editMode && !manualMode && (
                            <button className="copy-btn" onClick={() => handleCopy('birthday', card.birthday)}>
                                {copiedField === 'birthday' ? <Check size={16} /> : <Copy size={16} />}
                            </button>
                        )}
                    </div>

                    {/* Phone Number */}
                    <div className="wallet-field">
                        <div className="field-icon"><Phone size={18} /></div>
                        <div className="field-content">
                            <label>رقم الهاتف</label>
                            <span>{card.phone_number}</span>
                        </div>
                        <button className="copy-btn" onClick={() => handleCopy('phone', card.phone_number)}>
                            {copiedField === 'phone' ? <Check size={16} /> : <Copy size={16} />}
                        </button>
                    </div>
                </div>

                {/* Edit/Manual Mode Submit */}
                {(editMode || manualMode) && (
                    <div className="wallet-edit-actions">
                        <button
                            onClick={() => { setEditMode(false); setManualMode(false); loadCard(); }}
                            className="btn btn-wallet-secondary"
                        >
                            إلغاء
                        </button>
                        <button
                            onClick={manualMode ? handleManualFill : handleEdit}
                            className="btn btn-wallet-primary"
                            disabled={actionLoading}
                        >
                            {actionLoading ? 'جاري الحفظ...' : 'حفظ التغييرات'}
                        </button>
                    </div>
                )}

                {/* Save Warning Text - Distinctive color */}
                {!card.is_locked && !editMode && !manualMode && (
                    <div className="wallet-save-warning">
                        <AlertTriangle size={18} />
                        <span>بعد تفعيل الحساب، يجب عليك النقر على زر الحفظ</span>
                    </div>
                )}

                {/* Footer Actions - Premium Styled Buttons */}
                <div className="wallet-actions-footer" style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    padding: '16px 0'
                }}>
                    {!card.is_locked && !editMode && !manualMode && (
                        <button
                            onClick={confirmSave}
                            className="btn btn-wallet-save"
                            disabled={actionLoading}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '10px',
                                padding: '14px 24px',
                                fontSize: '15px',
                                fontWeight: '600',
                                borderRadius: '12px',
                                border: 'none',
                                background: 'linear-gradient(135deg, #00c853, #00a844)',
                                color: 'white',
                                cursor: 'pointer',
                                boxShadow: '0 4px 15px rgba(0, 200, 83, 0.3)',
                                transition: 'all 0.3s ease'
                            }}
                        >
                            <Save size={18} />
                            <span>حفظ</span>
                        </button>
                    )}

                    {/* Create Account Info Card - Only for locked cards */}
                    {card.is_locked && (
                        <button
                            onClick={openAccountInfoModal}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '10px',
                                padding: '14px 24px',
                                fontSize: '15px',
                                fontWeight: '600',
                                borderRadius: '12px',
                                border: 'none',
                                background: 'linear-gradient(135deg, #00c8ff, #0099cc)',
                                color: 'white',
                                cursor: 'pointer',
                                boxShadow: '0 4px 15px rgba(0, 200, 255, 0.3)',
                                transition: 'all 0.3s ease'
                            }}
                        >
                            <FileText size={18} />
                            <span>إنشاء بطاقة معلومات الحساب</span>
                        </button>
                    )}

                    <button
                        onClick={handleSaveAsImage}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '10px',
                            padding: '14px 24px',
                            fontSize: '15px',
                            fontWeight: '600',
                            borderRadius: '12px',
                            border: '2px solid rgba(255, 255, 255, 0.2)',
                            background: 'linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05))',
                            color: 'white',
                            cursor: 'pointer',
                            backdropFilter: 'blur(10px)',
                            transition: 'all 0.3s ease'
                        }}
                    >
                        <Image size={18} />
                        <span>حفظ كصورة</span>
                    </button>

                    <a
                        href={videoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '10px',
                            padding: '14px 24px',
                            fontSize: '15px',
                            fontWeight: '600',
                            borderRadius: '12px',
                            border: '2px solid rgba(255, 255, 255, 0.2)',
                            background: 'linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05))',
                            color: 'white',
                            cursor: 'pointer',
                            backdropFilter: 'blur(10px)',
                            textDecoration: 'none',
                            transition: 'all 0.3s ease'
                        }}
                    >
                        <Video size={18} />
                        <span>فيديو تعليمي</span>
                    </a>

                    <button
                        onClick={() => setShowTermsModal(true)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '10px',
                            padding: '14px 24px',
                            fontSize: '15px',
                            fontWeight: '600',
                            borderRadius: '12px',
                            border: '2px solid rgba(255, 255, 255, 0.2)',
                            background: 'transparent',
                            color: 'white',
                            cursor: 'pointer',
                            backdropFilter: 'blur(10px)',
                            transition: 'all 0.3s ease',
                            gridColumn: '1 / -1' // Span full width below the others
                        }}
                    >
                        <FileText size={18} />
                        <span>سياسة الاستخدام</span>
                    </button>
                </div>

                {/* Reusable Terms Modal */}
                {showTermsModal && (
                    <div className="wallet-terms-overlay" dir="rtl" style={{ zIndex: 1000 }}>
                        <div className="wallet-terms-modal" style={{ position: 'relative' }}>
                            <button
                                type="button"
                                onClick={() => setShowTermsModal(false)}
                                style={{
                                    position: 'absolute',
                                    top: '16px',
                                    left: '16px',
                                    background: 'rgba(0,0,0,0.1)',
                                    border: 'none',
                                    borderRadius: '50%',
                                    width: '32px',
                                    height: '32px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    color: '#333',
                                    fontSize: '18px',
                                    fontWeight: 'bold',
                                    zIndex: 10
                                }}
                            >
                                ✕
                            </button>
                            <h2>الشروط والأحكام</h2>
                            <div className="terms-content">
                                <h3>تعليمات إنشاء حساب {card.wallet_type === 'google' ? 'Google Play' : 'Apple ID'}</h3>
                                <p>هذا الكارت هو محفظة لتخزين حساب الـ {card.wallet_type === 'google' ? 'Google Play' : 'Apple ID'}</p>
                                <p>يقوم الزبون بإنشائه بنفسه من جهازه الخاص وبرقم هاتفه، ويتم حفظه هنا.</p>
                                <p>احفظ رقمك الشخصي ثم ابدأ بإنشاء الحساب على رقم هاتفك.</p>

                                <h3>ملاحظات مهمة:</h3>
                                <ol>
                                    <li>يجب استعمال رقم هاتف لم يستعمل سابقا في تفعيل حساب {card.wallet_type === 'google' ? 'Google Play' : 'Apple ID'}</li>
                                    <li>يتم حفظ معلومات الحساب في نظامنا 3 سنوات بعدها غير مسؤلين عن فقدان المعلومات بعد 3 سنوات من تفعيل الحساب.</li>
                                    <li>يمكنك طلب بطاقة خاصه تتضمن معلومات حسابك عند تفعيل حسابك.</li>
                                </ol>

                                <p>يجب ألا يكون الجهاز قد تم إنشاء حسابات عليه سابقا. في بعض الأحيان تكون هناك هواتف مستعملة تم إنشاء حسابات عليها في وقت سابق، حيث إن شركة {card.wallet_type === 'google' ? 'Google Play' : 'Apple ID'} تعطي سماحًا بعدد معين من الحسابات لكل جهاز لذلك قد يتم حظر الجهاز من قبل شركة {card.wallet_type === 'google' ? 'Google Play' : 'Apple ID'} وتظهر رسالة تعذر إنشاء الحساب، حاول في وقت لاحق. هذه المشكلة لا علاقة لها بالبطاقة، ولكنها تعني أن الجهاز نفسه محظور من إنشاء الحسابات في هذه الحالة قم بتفعيل الحساب على جهاز آخر ثم سجل الدخول إلى جهازك. قم بأخذ لقطة شاشة للحساب والاحتفاظ بها لديك بعد تفعيله.</p>

                                <h3>إخلاء مسؤولية:</h3>
                                <p>الضمان المقدم يقتصر حصريا على ضمان استبدال بطاقة المحفظة فقط، ولا يشمل أي مسؤولية أخرى متعلقة بحساب {card.wallet_type === 'google' ? 'Google Play' : 'Apple ID'} أو أي أضرار مباشرة أو غير مباشرة قد تلحق بالجهاز لأي سبب كان. نحن لا نبيع حساب {card.wallet_type === 'google' ? 'Google Play' : 'Apple ID'}، وإنما نبيع بطاقة محفظة مخصصة لتخزين الحساب الذي يقوم الزبون بإنشائه بنفسه وباستخدام جهازه ورقم هاتفه الشخصي. في الوضع الطبيعي إن إنشاء الحساب يدويا وبشكل مباشر وبرقم هاتف الزبون يُعد حسابًا رسميا وأصوليا صالحًا لاستخدامه كحساب iCloud و {card.wallet_type === 'google' ? 'Google Play' : 'Apple ID'}. ومع ذلك، قد تطرأ في أي وقت أخطاء أو مشكلات داخل أنظمة شركة {card.wallet_type === 'google' ? 'Google Play' : 'Apple ID'}، دون أسباب واضحة، قد تؤدي إلى تعطيل الوصول إلى بعض الخدمات أو التسبب بأضرار، وقد صرحت شركة {card.wallet_type === 'google' ? 'Google Play' : 'Apple ID'} بذلك صراحة ضمن شروط استخدام خدماتها. وبمجرد استخدام أي من خدمات أو منتجات {card.wallet_type === 'google' ? 'Google Play' : 'Apple ID'}، فإن المستخدم يقر ويتحمل كامل المسؤولية عن ذلك وحده. وعليه فإن البائع يخلي مسؤوليته بالكامل وينتهي التزامه عند تسليم بطاقة المحفظة للزبون.</p>

                                <p className="terms-final"><strong>يرجى الالتزام بجميع التعليمات، ويُعد استخدامك للمحفظة إقرارًا بموافقتك الكاملة على جميع الشروط والتعليمات المذكورة أعلاه.</strong></p>
                            </div>

                            <div style={{ padding: '0 16px 20px', display: 'flex', justifyContent: 'center' }}>
                                <button
                                    onClick={() => setShowTermsModal(false)}
                                    className="phone-submit-btn"
                                    style={{ background: headerColor, marginTop: '10px', width: '100%', border: 'none', padding: '12px', borderRadius: '8px', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}
                                >
                                    إغلاق
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Print Date */}
                <div className="wallet-print-date">
                    تاريخ الطباعة: {card.printed_at ? new Date(card.printed_at).toLocaleDateString('en-CA') : new Date().toLocaleDateString('en-CA')}
                </div>
            </div>
        </div>
    );
};

export default WalletCardView;
