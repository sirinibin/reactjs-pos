import React from "react";
import ReactPaginate from "react-paginate";
import { useTranslation } from "react-i18next";

const DEFAULT_PAGE_SIZES = [20, 40, 50, 100];

function PaginationControls({ totalPages, page, totalItems, offset, currentPageItemsCount, pageSize, onPageChange, onPageSizeChange, pageSizes, showSizePicker = true, showCount = true }) {
    const { t } = useTranslation('common');
    const sizes = pageSizes || DEFAULT_PAGE_SIZES;

    return (
        <>
            {showSizePicker && totalItems > 0 && (
                <>
                    <label className="form-label mb-0">{t('Size')}:&nbsp;</label>
                    <select
                        value={pageSize}
                        onChange={(e) => onPageSizeChange(e.target.value)}
                        className="form-control"
                        style={{ width: "55px" }}
                    >
                        {sizes.map(s => <option key={s} value={String(s)}>{s}</option>)}
                    </select>
                </>
            )}
            <div className="w-100" style={{ overflowX: "auto" }}>
                {totalPages ? (
                    <ReactPaginate
                        breakLabel="..."
                        nextLabel={t('next >')}
                        onPageChange={(event) => onPageChange(event.selected + 1)}
                        pageRangeDisplayed={3}
                        marginPagesDisplayed={1}
                        pageCount={totalPages}
                        previousLabel={t('< prev')}
                        renderOnZeroPageCount={null}
                        className="pagination flex-wrap mb-0"
                        pageClassName="page-item"
                        pageLinkClassName="page-link"
                        activeClassName="active"
                        previousClassName="page-item"
                        nextClassName="page-item"
                        previousLinkClassName="page-link"
                        nextLinkClassName="page-link"
                        forcePage={page - 1}
                    />
                ) : null}
            </div>
            {showCount && totalItems > 0 && (
                <span className="text-muted small">
                    {t("Showing {{from}}-{{to}} of {{totalItems}}", {
                        from: offset + 1,
                        to: offset + currentPageItemsCount,
                        totalItems,
                    })}
                    &nbsp;|&nbsp;
                    {t("Page {{page}} of {{totalPages}}", { page, totalPages })}
                </span>
            )}
        </>
    );
}

export default PaginationControls;
