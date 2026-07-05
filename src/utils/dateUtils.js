import { formatDistanceToNowStrict } from "date-fns";
import { enUS } from "date-fns/locale";
import React from "react";

export const countryTimezoneMap = {
    'SA': 'Asia/Riyadh', 'AE': 'Asia/Dubai', 'KW': 'Asia/Kuwait',
    'QA': 'Asia/Qatar', 'BH': 'Asia/Bahrain', 'OM': 'Asia/Muscat',
    'IN': 'Asia/Kolkata', 'PK': 'Asia/Karachi', 'BD': 'Asia/Dhaka',
    'LK': 'Asia/Colombo', 'NP': 'Asia/Kathmandu', 'MY': 'Asia/Kuala_Lumpur',
    'SG': 'Asia/Singapore', 'PH': 'Asia/Manila', 'ID': 'Asia/Jakarta',
    'EG': 'Africa/Cairo', 'JO': 'Asia/Amman', 'LB': 'Asia/Beirut',
    'IQ': 'Asia/Baghdad', 'IR': 'Asia/Tehran', 'TR': 'Europe/Istanbul',
    'GB': 'Europe/London', 'DE': 'Europe/Berlin', 'FR': 'Europe/Paris',
    'US': 'America/New_York', 'CA': 'America/Toronto', 'AU': 'Australia/Sydney',
};

export function formatInStoreTimezone(dateStr, storeCountryCode = null) {
    if (!dateStr) return '';
    const cc = localStorage.getItem('store_country_code') || storeCountryCode;
    const tz = countryTimezoneMap[cc] || 'UTC';
    const tzLabel = tz.replace(/_/g, ' ');
    try {
        const d = new Date(dateStr);
        const formatted = d.toLocaleString('en-US', {
            timeZone: tz,
            year: 'numeric', month: 'short', day: '2-digit',
            hour: '2-digit', minute: '2-digit', second: '2-digit',
            hour12: true,
        });
        return `${formatted} (${tzLabel})`;
    } catch {
        return dateStr;
    }
}

export function formatPaymentMethod(method) {
    if (!method) return "—";
    return method.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

export const shortLocale = {
    ...enUS,
    formatDistance: (token, count) => {
        const format = {
            xSeconds: `${count}s`, xMinutes: `${count}m`, xHours: `${count}h`,
            xDays: `${count}d`, xMonths: `${count}mo`, xYears: `${count}y`,
        };
        return format[token] || "";
    },
};

export const TimeAgo = ({ date }) => (
    <span>{formatDistanceToNowStrict(new Date(date), { locale: shortLocale })} ago</span>
);
