import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Footer from '../Footer';

describe('Footer', () => {
    it('renders without crashing', () => {
        const { container } = render(
            <MemoryRouter>
                <Footer />
            </MemoryRouter>
        );
        expect(container).toBeTruthy();
    });

    it('contains copyright and brand text', () => {
        render(
            <MemoryRouter>
                <Footer />
            </MemoryRouter>
        );
        expect(screen.getByText(/Startup Tech Consultancy LTD, UK/i)).toBeInTheDocument();
    });

    it('renders a footer HTML element with footer class', () => {
        const { container } = render(
            <MemoryRouter>
                <Footer />
            </MemoryRouter>
        );
        const footerEl = container.querySelector('footer.footer');
        expect(footerEl).toBeInTheDocument();
    });

    it('renders key elements consistently', () => {
        const { container } = render(
            <MemoryRouter>
                <Footer />
            </MemoryRouter>
        );

        // footer element present
        expect(container.querySelector('footer.footer')).toBeInTheDocument();

        // link to startuptech.uk present with correct attributes
        const link = container.querySelector('a[href="https://www.startuptech.uk/"]');
        expect(link).toBeInTheDocument();
        expect(link).toHaveAttribute('target', '_blank');
        expect(link).toHaveAttribute('rel', 'noreferrer');

        // copyright symbol present in link text
        expect(link.textContent).toMatch(/Startup Tech Consultancy LTD, UK/);

        // layout columns present
        expect(container.querySelector('.col-6.text-start')).toBeInTheDocument();
        expect(container.querySelector('.col-6.text-end')).toBeInTheDocument();
    });
});
