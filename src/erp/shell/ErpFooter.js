import React from 'react';

export default function ErpFooter() {
    const year = new Date().getFullYear();
    return (
        <footer className="erp-footer">
            <span>© {year} StartERP</span>
            <span>
                A product of{' '}
                <a href="https://ai.gulfunionozone.com/" target="_blank" rel="noreferrer">ai.gulfunionozone.com</a>
                {' '}· An AI &amp; Software Wing of Gulf Union Ozone
            </span>
        </footer>
    );
}
