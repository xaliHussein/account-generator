import React, { useState } from 'react';
import { Sparkles, AlertCircle, Loader2 } from 'lucide-react';
import Button from './ui/Button';
import Card from './ui/Card';
import ProgressBar from './ui/ProgressBar';
import { validateAccountCount } from '../services/accountGenerator';

/**
 * Generator controls component
 */
const GeneratorControls = ({
    onGenerate,
    isGenerating,
    progress,
    disabled = false
}) => {
    const [count, setCount] = useState('100');
    const [error, setError] = useState('');

    const handleCountChange = (e) => {
        const value = e.target.value;
        setCount(value);

        // Clear error on change
        if (error) {
            const validation = validateAccountCount(value);
            if (validation.valid) {
                setError('');
            }
        }
    };

    const handleGenerate = () => {
        const validation = validateAccountCount(count);

        if (!validation.valid) {
            setError(validation.error);
            return;
        }

        setError('');
        onGenerate(validation.value);
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !isGenerating) {
            handleGenerate();
        }
    };

    const presets = [10, 50, 100, 500, 1000, 5000];

    return (
        <Card>
            <Card.Header>
                <Sparkles size={18} style={{ color: 'var(--color-accent-purple)' }} />
                <span>Generate Accounts</span>
            </Card.Header>
            <Card.Body>
                <div className="generator-controls">
                    {/* Count input */}
                    <div className="input-group">
                        <label className="input-label">Number of Accounts</label>
                        <input
                            type="number"
                            className={`input input-lg ${error ? 'input-error' : ''}`}
                            value={count}
                            onChange={handleCountChange}
                            onKeyPress={handleKeyPress}
                            min="1"
                            max="5000"
                            disabled={isGenerating || disabled}
                            placeholder="Enter amount..."
                            style={error ? { borderColor: 'var(--color-accent-red)' } : {}}
                        />
                        {error && (
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                color: 'var(--color-accent-red)',
                                fontSize: 'var(--font-size-sm)',
                                marginTop: 4
                            }}>
                                <AlertCircle size={14} />
                                {error}
                            </div>
                        )}
                    </div>

                    {/* Preset buttons */}
                    <div style={{ marginTop: 'var(--spacing-md)' }}>
                        <label className="input-label" style={{ marginBottom: 8, display: 'block' }}>
                            Quick Select
                        </label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                            {presets.map((preset) => (
                                <button
                                    key={preset}
                                    className={`btn btn-sm ${Number(count) === preset ? 'btn-primary' : 'btn-secondary'}`}
                                    onClick={() => {
                                        setCount(String(preset));
                                        setError('');
                                    }}
                                    disabled={isGenerating || disabled}
                                >
                                    {preset.toLocaleString()}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Progress indicator */}
                    {isGenerating && progress && (
                        <div style={{ marginTop: 'var(--spacing-lg)' }}>
                            <ProgressBar
                                value={progress.current}
                                max={progress.total}
                                status={getStatusMessage(progress)}
                            />
                        </div>
                    )}

                    {/* Generate button */}
                    <div style={{ marginTop: 'var(--spacing-lg)' }}>
                        <Button
                            variant="primary"
                            size="lg"
                            fullWidth
                            icon={isGenerating ? Loader2 : Sparkles}
                            onClick={handleGenerate}
                            disabled={isGenerating || disabled}
                            loading={isGenerating}
                        >
                            {isGenerating
                                ? `Generating ${progress?.current || 0} of ${progress?.total || 0}...`
                                : `Generate ${Number(count).toLocaleString()} Accounts`
                            }
                        </Button>
                    </div>

                    {/* Helper text */}
                    <p style={{
                        textAlign: 'center',
                        fontSize: 'var(--font-size-sm)',
                        color: 'var(--color-text-tertiary)',
                        marginTop: 'var(--spacing-md)'
                    }}>
                        Generate up to 5,000 accounts in a single batch
                    </p>
                </div>
            </Card.Body>
        </Card>
    );
};

/**
 * Get status message based on progress
 */
const getStatusMessage = (progress) => {
    if (!progress) return '';

    const { status, current, total } = progress;

    switch (status) {
        case 'generating':
            return `Generating accounts... (${current}/${total})`;
        case 'complete':
            return 'Generation complete!';
        default:
            return `Processing... (${current}/${total})`;
    }
};

export default GeneratorControls;
