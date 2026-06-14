import React from 'react';
import { Dropdown, DropdownButton } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { LANGUAGE_OPTIONS } from '../i18n/config';

function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const currentLanguage = LANGUAGE_OPTIONS.find(
    (lang) => lang.code === i18n.language
  ) || LANGUAGE_OPTIONS[0];

  const handleLanguageChange = (languageCode) => {
    i18n.changeLanguage(languageCode);
  };

  return (
    <DropdownButton
      id="language-dropdown"
      title={currentLanguage.nativeName}
      drop="down"
      variant="light"
      size="sm"
      className="me-2"
    >
      {LANGUAGE_OPTIONS.map((language) => (
        <Dropdown.Item
          key={language.code}
          onClick={() => handleLanguageChange(language.code)}
          active={currentLanguage.code === language.code}
        >
          {language.nativeName} ({language.name})
        </Dropdown.Item>
      ))}
    </DropdownButton>
  );
}

export default LanguageSwitcher;
