import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
    getWalletCardByToken,
    submitWalletCardPhone,
    switchWalletCard,
    editWalletCard,
    manualFillWalletCard,
    saveWalletCard
} from '../services/walletApi';
import {
    Copy, Check, RefreshCw, Edit3, FileText, Save, Image, Video,
    Lock, Phone, Calendar, Mail, User, Key, AlertCircle, CheckCircle, AlertTriangle
} from 'lucide-react';
import html2canvas from 'html2canvas';

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

    // Phase 1: Phone Collection
    if (!card.phone_collected) {
        return (
            <div className="wallet-card-view phone-collection" dir="rtl">
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

                {/* Footer Actions */}
                <div className="wallet-actions-footer">
                    {!card.is_locked && !editMode && !manualMode && (
                        <button
                            onClick={confirmSave}
                            className="btn btn-wallet-save"
                            disabled={actionLoading}
                        >
                            <Save size={16} />
                            <h5>حفظ</h5>
                        </button>
                    )}

                    <button onClick={handleSaveAsImage} className="btn btn-wallet-secondary">
                        <Image size={16} />
                        <h5> حفظ كصورة</h5>
                    </button>

                    <a href={videoUrl} target="_blank" rel="noopener noreferrer" className="btn btn-wallet-secondary">
                        <Video size={16} />
                        فيديو تعليمي
                    </a>
                </div>

                {/* Print Date */}
                <div className="wallet-print-date">
                    تاريخ الطباعة: {card.printed_at ? new Date(card.printed_at).toLocaleDateString('ar-EG') : new Date().toLocaleDateString('ar-EG')}
                </div>
            </div>
        </div>
    );
};

export default WalletCardView;
