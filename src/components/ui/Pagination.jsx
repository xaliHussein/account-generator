import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Reusable Pagination Component
 * Provides page navigation with first/last, prev/next, and page numbers
 */
const Pagination = ({
    currentPage,
    totalPages,
    onPageChange,
    totalItems,
    itemsPerPage,
    showItemCount = true
}) => {
    if (totalPages <= 1) return null;

    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalItems);

    // Generate page numbers with ellipsis
    const getPageNumbers = () => {
        const pages = [];
        const maxVisible = 5;

        if (totalPages <= maxVisible) {
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            // Always show first page
            pages.push(1);

            if (currentPage > 3) {
                pages.push('...');
            }

            // Show pages around current
            const start = Math.max(2, currentPage - 1);
            const end = Math.min(totalPages - 1, currentPage + 1);

            for (let i = start; i <= end; i++) {
                if (!pages.includes(i)) {
                    pages.push(i);
                }
            }

            if (currentPage < totalPages - 2) {
                pages.push('...');
            }

            // Always show last page
            if (!pages.includes(totalPages)) {
                pages.push(totalPages);
            }
        }

        return pages;
    };

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 'var(--spacing-sm) 0',
            flexWrap: 'wrap',
            gap: 'var(--spacing-sm)'
        }}>
            {/* Item count */}
            {showItemCount && (
                <div style={{
                    fontSize: 'var(--font-size-sm)',
                    color: 'var(--color-text-secondary)'
                }}>
                    Showing {startItem}-{endItem} of {totalItems}
                </div>
            )}

            {/* Page navigation */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--spacing-xs)'
            }}>
                {/* Previous button */}
                <button
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    style={{
                        padding: 'var(--spacing-xs) var(--spacing-sm)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--border-radius-sm)',
                        background: currentPage === 1 ? 'var(--color-bg-tertiary)' : 'var(--color-bg-secondary)',
                        color: currentPage === 1 ? 'var(--color-text-tertiary)' : 'var(--color-text-primary)',
                        cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center'
                    }}
                >
                    <ChevronLeft size={16} />
                </button>

                {/* Page numbers */}
                {getPageNumbers().map((page, index) => (
                    page === '...' ? (
                        <span
                            key={`ellipsis-${index}`}
                            style={{
                                padding: '0 var(--spacing-xs)',
                                color: 'var(--color-text-tertiary)'
                            }}
                        >
                            ...
                        </span>
                    ) : (
                        <button
                            key={page}
                            onClick={() => onPageChange(page)}
                            style={{
                                minWidth: '32px',
                                padding: 'var(--spacing-xs) var(--spacing-sm)',
                                border: page === currentPage
                                    ? '1px solid var(--color-accent-blue)'
                                    : '1px solid var(--border-color)',
                                borderRadius: 'var(--border-radius-sm)',
                                background: page === currentPage
                                    ? 'var(--color-accent-blue)'
                                    : 'var(--color-bg-secondary)',
                                color: page === currentPage
                                    ? '#fff'
                                    : 'var(--color-text-primary)',
                                cursor: 'pointer',
                                fontWeight: page === currentPage ? 600 : 400,
                                fontSize: 'var(--font-size-sm)'
                            }}
                        >
                            {page}
                        </button>
                    )
                ))}

                {/* Next button */}
                <button
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    style={{
                        padding: 'var(--spacing-xs) var(--spacing-sm)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--border-radius-sm)',
                        background: currentPage === totalPages ? 'var(--color-bg-tertiary)' : 'var(--color-bg-secondary)',
                        color: currentPage === totalPages ? 'var(--color-text-tertiary)' : 'var(--color-text-primary)',
                        cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center'
                    }}
                >
                    <ChevronRight size={16} />
                </button>
            </div>
        </div>
    );
};

export default Pagination;
