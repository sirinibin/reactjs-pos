import React, { useState, useEffect, forwardRef, useImperativeHandle, useMemo, useRef } from "react";
import { Modal } from "react-bootstrap";

import { Spinner } from "react-bootstrap";
import Resizer from "react-image-file-resizer";
import countryList from 'react-select-country-list';
import { Typeahead } from "react-bootstrap-typeahead";
import { useEnterKeyNavigation } from '../utils/useEnterKeyNavigation.js';
//import { DebounceInput } from 'react-debounce-input';

const StoreCreate = forwardRef((props, ref) => {

    useImperativeHandle(ref, () => ({
        open(id) {
            errors = {};
            setErrors({ ...errors });
            //selectedStores = [];
            //setSelectedStores(selectedStores);

            formData = {
                national_address: {},
                bank_account: {},
                settings: {
                    invoice: invoiceSettings,
                    stats_show_overall_summary: false,
                    stats_show_profit_loss_statement: true,
                },
                zatca: {
                    phase: "1",
                    env: "NonProduction",
                },
                business_category: "Supply Activities",
                branch_name: "",
                code: "",
                vat_percent: 15.00,
                stock_transfer_serial_number: {
                    prefix: "ST-TR",
                    start_from_count: 1,
                    padding_count: 3
                },
                sales_serial_number: {
                    prefix: "S-INV",
                    start_from_count: 1,
                    padding_count: 3
                },
                sales_return_serial_number: {
                    prefix: "SR-INV",
                    start_from_count: 1,
                    padding_count: 3
                },
                purchase_serial_number: {
                    prefix: "P-INV",
                    start_from_count: 1,
                    padding_count: 3
                },
                purchase_return_serial_number: {
                    prefix: "PR-INV",
                    start_from_count: 1,
                    padding_count: 3
                },
                purchase_order_serial_number: {
                    prefix: "PO",
                    start_from_count: 1,
                    padding_count: 4
                },
                quotation_serial_number: {
                    prefix: "QTN",
                    start_from_count: 1,
                    padding_count: 3
                },
                quotation_sales_return_serial_number: {
                    prefix: "QTN-SR-INV",
                    start_from_count: 1,
                    padding_count: 3
                },
                customer_serial_number: {
                    prefix: "C",
                    start_from_count: 1,
                    padding_count: 4
                },
                vendor_serial_number: {
                    prefix: "V",
                    start_from_count: 1,
                    padding_count: 4
                },
                expense_serial_number: {
                    prefix: "EXP",
                    start_from_count: 1,
                    padding_count: 4
                },
                customer_deposit_serial_number: {
                    prefix: "RCVBLE",
                    start_from_count: 1,
                    padding_count: 4
                },
                customer_withdrawal_serial_number: {
                    prefix: "PYBLE",
                    start_from_count: 1,
                    padding_count: 4
                },
                capital_deposit_serial_number: {
                    prefix: "CAP-DPST",
                    start_from_count: 1,
                    padding_count: 4
                },
                divident_serial_number: {
                    prefix: "CAP-DRWNG",
                    start_from_count: 1,
                    padding_count: 4
                },
                delivery_note_serial_number: {
                    prefix: "DEL-NOTE",
                    start_from_count: 1,
                    padding_count: 6
                },
            };

            setFormData({ ...formData });
            if (id) {
                getStore(id);
            }
            fetchCustomerPackages();
            SetShow(true);
        },

    }));

    function deepFillEmptyStrings(target, defaults) {
        if (typeof target !== 'object' || target === null) return;

        for (const key in defaults) {
            const defaultVal = defaults[key];
            const targetVal = target[key];

            // If both are objects (but not arrays), go deeper
            if (
                typeof defaultVal === 'object' &&
                defaultVal !== null &&
                !Array.isArray(defaultVal)
            ) {
                if (
                    typeof targetVal !== 'object' ||
                    targetVal === null ||
                    Array.isArray(targetVal)
                ) {
                    target[key] = {};
                }
                deepFillEmptyStrings(target[key], defaultVal);
            } else {
                if (typeof targetVal === 'undefined' || targetVal === null || targetVal === '') {
                    target[key] = defaultVal;
                }
            }
        }
    }


    const invoiceSettings = {
        quotation_sales_titles: {
            paid: "TAX INVOICE | الفاتورة الضريبية",
            credit: "CREDIT TAX INVOICE | فاتورة ضريبة الائتمان",
            cash: "CASH TAX INVOICE | فاتورة ضريبية نقدية",
        },
        quotation_sales_return_titles: {
            paid: "SALES RETURN TAX INVOICE | فاتورة ضريبة المبيعات المرتجعة",
            credit: "SALES RETURN CREDIT TAX INVOICE | إقرار مبيعات فاتورة ضريبة الائتمان",
            cash: "SALES RETURN CASH TAX INVOICE | إقرار مبيعات فاتورة ضريبية نقدية",
        },
        quotation_title: "QUOTATION | اقتباس",
        delivery_note_title: "DELIVERY NOTE | مذكرة التسليم",
        stock_transfer_title: "STOCK TRANSFER | نقل الأسهم",
        purchase_order_title: "PURCHASE ORDER | أمر الشراء",
        payable_title: "PAYMENT RECEIPT (PAYABLE / REFUND) | إيصال الدفع (مستحق الدفع / مسترد)",
        receivable_title: "PAYMENT RECEIPT (RECEIVABLE) | إيصال الدفع (مستحق القبض)",
        phase1: {
            sales_titles: {
                paid: "TAX INVOICE | الفاتورة الضريبية",
                credit: "CREDIT TAX INVOICE | فاتورة ضريبة الائتمان",
                cash: "CASH TAX INVOICE | فاتورة ضريبية نقدية",
            },
            sales_return_titles: {
                paid: "SALES RETURN TAX INVOICE | فاتورة ضريبة المبيعات المرتجعة",
                credit: "SALES RETURN CREDIT TAX INVOICE | إقرار مبيعات فاتورة ضريبة الائتمان",
                cash: "SALES RETURN CASH TAX INVOICE | إقرار مبيعات فاتورة ضريبية نقدية",
            },
            purchase_titles: {
                paid: "PURCHASE TAX INVOICE | فاتورة ضريبة الشراء",
                credit: "CREDIT PURCHASE TAX INVOICE | فاتورة ضريبة الشراء بالائتمان",
                cash: "CASH PURCHASE TAX INVOICE | فاتورة ضريبة الشراء النقدي",
            },
            purchase_return_titles: {
                paid: "PURCHASE RETURN TAX INVOICE | فاتورة ضريبة إرجاع المشتريات",
                credit: "CREDIT PURCHASE RETURN TAX INVOICE | فاتورة ضريبة إرجاع الشراء بالائتمان",
                cash: "CASH PURCHASE RETURN TAX INVOICE | فاتورة ضريبة إرجاع الشراء النقدي",
            },
        },
        phase2: {
            sales_titles: {
                paid: "SIMPLIFIED TAX INVOICE | فاتورة ضريبية مبسطة",
                credit: "SIMPLIFIED CREDIT TAX INVOICE | فاتورة ضريبة الائتمان المبسطة",
                cash: "SIMPLIFIED CASH TAX INVOICE | فاتورة ضريبية نقدية مبسطة",
            },
            sales_return_titles: {
                paid: "SIMPLIFIED CREDIT NOTE TAX INVOICE | فاتورة ضريبية مبسطة لملاحظة الائتمان",
                credit: "SIMPLIFIED CREDIT NOTE CREDIT TAX INVOICE | مذكرة ائتمان مبسطة فاتورة ضريبة الائتمان",
                cash: "SIMPLIFIED CREDIT NOTE CASH TAX INVOICE | فاتورة ضريبية نقدية مبسطة",
            },
            purchase_titles: {
                paid: "PURCHASE TAX INVOICE | فاتورة ضريبة الشراء",
                credit: "CREDIT PURCHASE TAX INVOICE | فاتورة ضريبة الشراء بالائتمان",
                cash: "CASH PURCHASE TAX INVOICE | فاتورة ضريبة الشراء النقدي",
            },
            purchase_return_titles: {
                paid: "PURCHASE RETURN TAX INVOICE | فاتورة ضريبة إرجاع المشتريات",
                credit: "CREDIT PURCHASE RETURN TAX INVOICE | فاتورة ضريبة إرجاع الشراء بالائتمان",
                cash: "CASH PURCHASE RETURN TAX INVOICE | فاتورة ضريبة إرجاع الشراء النقدي",
            },
        },
        phase2_b2b: {
            sales_titles: {
                paid: "STANDARD TAX INVOICE | فاتورة ضريبية قياسية",
                credit: "STANDARD CREDIT TAX INVOICE | فاتورة ضريبة الائتمان القياسية",
                cash: "STANDARD CASH TAX INVOICE | فاتورة ضريبية نقدية قياسية",
            },
            sales_return_titles: {
                paid: "STANDARD CREDIT NOTE TAX INVOICE | فاتورة ضريبية لسند ائتمان قياسي",
                credit: "STANDARD CREDIT NOTE CREDIT TAX INVOICE | فاتورة ضريبة الائتمان القياسية",
                cash: "STANDARD CREDIT NOTE CASH TAX INVOICE | فاتورة ضريبية نقدية بسند ائتمان قياسي",
            },
            purchase_titles: {
                paid: "PURCHASE TAX INVOICE | فاتورة ضريبة الشراء",
                credit: "CREDIT PURCHASE TAX INVOICE | فاتورة ضريبة الشراء بالائتمان",
                cash: "CASH PURCHASE TAX INVOICE | فاتورة ضريبة الشراء النقدي",
            },
            purchase_return_titles: {
                paid: "PURCHASE RETURN TAX INVOICE | فاتورة ضريبة إرجاع المشتريات",
                credit: "CREDIT PURCHASE RETURN TAX INVOICE | فاتورة ضريبة إرجاع الشراء بالائتمان",
                cash: "CASH PURCHASE RETURN TAX INVOICE | فاتورة ضريبة إرجاع الشراء النقدي",
            },
        },
    };

    useEnterKeyNavigation();


    let [errors, setErrors] = useState({});
    const [isProcessing, setProcessing] = useState(false);
    const [activeTab, setActiveTab] = useState('general');
    const [customerPackages, setCustomerPackages] = useState([]);
    const [flash, setFlash] = useState(null);
    const flashTimerRef = useRef(null);
    function showFlash(text, type = 'success') {
        if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
        setFlash({ text, type });
        flashTimerRef.current = setTimeout(() => setFlash(null), 4000);
    }

    const validateEmail = (email) => {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    };



    //fields
    let [formData, setFormData] = useState({
        national_address: {},
        bank_account: {},
        settings: {},
        zatca: {
            phase: "1",
            env: "NonProduction",
        },
        branch_name: "",
        vat_percent: 15.00,
        business_category: "Supply Activities",
        stock_transfer_serial_number: {
            prefix: "ST-TR",
            start_from_count: 1,
            padding_count: 3
        },
        sales_serial_number: {
            prefix: "S-INV",
            start_from_count: 1,
            padding_count: 3
        },
        sales_return_serial_number: {
            prefix: "SR-INV",
            start_from_count: 1,
            padding_count: 3
        },
        purchase_serial_number: {
            prefix: "P-INV",
            start_from_count: 1,
            padding_count: 3
        },
        purchase_return_serial_number: {
            prefix: "PR-INV",
            start_from_count: 1,
            padding_count: 3
        },
        purchase_order_serial_number: {
            prefix: "PO",
            start_from_count: 1,
            padding_count: 4
        },
        quotation_serial_number: {
            prefix: "QTN",
            start_from_count: 1,
            padding_count: 3
        },
        quotation_sales_return_serial_number: {
            prefix: "QTN-SR-INV",
            start_from_count: 1,
            padding_count: 3
        },
        customer_serial_number: {
            prefix: "CUST",
            start_from_count: 1,
            padding_count: 4
        },
        vendor_serial_number: {
            prefix: "VND",
            start_from_count: 1,
            padding_count: 4
        },
        expense_serial_number: {
            prefix: "EXP",
            start_from_count: 1,
            padding_count: 4
        },
        customer_deposit_serial_number: {
            prefix: "CUST-RCVBLE",
            start_from_count: 1,
            padding_count: 4
        },
        customer_withdrawal_serial_number: {
            prefix: "CUST-PAYBLE",
            start_from_count: 1,
            padding_count: 4
        },
        capital_deposit_serial_number: {
            prefix: "CAP-DPST",
            start_from_count: 1,
            padding_count: 4
        },
        divident_serial_number: {
            prefix: "CAP-DRWNG",
            start_from_count: 1,
            padding_count: 4
        },
        delivery_note_serial_number: {
            prefix: "DEL-NOTE",
            start_from_count: 1,
            padding_count: 6
        },
    });

    const [show, SetShow] = useState(false);

    function handleClose() {
        SetShow(false);
    }

    useEffect(() => {
        let at = localStorage.getItem("access_token");
        if (!at) {
            window.location = "/";
        }
    });


    function fetchCustomerPackages() {
        fetch('/v1/customer-package?limit=500', {
            headers: { Authorization: localStorage.getItem('access_token') },
        })
            .then(r => r.json())
            .then(data => {
                if (data.status) setCustomerPackages(data.result || []);
            });
    }

    async function getStore(id) {
        try {
            const defaults = formData;
            const requestOptions = {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': localStorage.getItem('access_token'),
                },
            };
            const response = await fetch(`/v1/store/${id}`, requestOptions);
            const isJson = response.headers.get('content-type')?.includes('application/json');
            const data = isJson && await response.json();
            if (!response.ok) return;
            formData = data.result;
            deepFillEmptyStrings(formData, defaults);
            setFormData({ ...formData });
        } catch (error) { }
    }


    function resizeFIle(file, w, h, cb) {
        Resizer.imageFileResizer(
            file,
            w,
            h,
            "JPEG",
            100,
            0,
            (uri) => {
                cb(uri);
            },
            "base64"
        );
    }

    function isValidNDigitNumber(str, n) {
        const regex = new RegExp(`^\\d{${n}}$`); // Dynamically create regex
        return regex.test(str);
    }


    const NumberStartAndEndWith = (num, startAndEndWithNo) => {
        //const regex = /^3\d*3$/; // Starts (^) with 3, ends ($) with 3, and has digits (\d*) in between.
        const regex = new RegExp(`^${startAndEndWithNo}\\d*${startAndEndWithNo}$`);
        return regex.test(num);
    };


    function IsAlphanumeric(str) {
        const regex = /^[a-zA-Z0-9]+$/; // Allows only letters and numbers
        return regex.test(str);
    }

    function handleCreate(event) {
        event.preventDefault();
        console.log("Inside handle Create");

        formData.use_products_from_store_id = [];

        /*
        for (var i = 0; i < selectedStores.length; i++) {
            formData.use_products_from_store_id.push(selectedStores[i].id);
        }
        */


        if (formData.vat_percent) {
            formData.vat_percent = parseFloat(formData.vat_percent);
        } else {
            formData.vat_percent = null;
        }

        if (formData.phone) {
            formData.phone_in_arabic = convertToArabicNumber(formData.phone.toString());
        }

        if (formData.vat_no) {
            formData.vat_no_in_arabic = convertToArabicNumber(formData.vat_no.toString());
        }

        if (formData.zipcode) {
            formData.zipcode_in_arabic = convertToArabicNumber(formData.zipcode.toString());
        }

        if (formData.registration_number) {
            formData.registration_number_in_arabic = convertToArabicNumber(formData.registration_number.toString());
        }

        if (formData.national_address.application_no) {
            formData.national_address.application_no_arabic = convertToArabicNumber(formData.national_address.application_no.toString());
        }

        if (formData.national_address.service_no) {
            formData.national_address.service_no_arabic = convertToArabicNumber(formData.national_address.service_no.toString());
        }

        if (formData.national_address.customer_account_no) {
            formData.national_address.customer_account_no_arabic = convertToArabicNumber(formData.national_address.customer_account_no.toString());
        }

        if (formData.national_address.building_no) {
            formData.national_address.building_no_arabic = convertToArabicNumber(formData.national_address.building_no.toString());
        }

        if (formData.national_address.zipcode) {
            formData.national_address.zipcode_arabic = convertToArabicNumber(formData.national_address.zipcode.toString());
        }

        if (formData.national_address.additional_no) {
            formData.national_address.additional_no_arabic = convertToArabicNumber(formData.national_address.additional_no.toString());
        }

        if (formData.national_address.unit_no) {
            formData.national_address.unit_no_arabic = convertToArabicNumber(formData.national_address.unit_no.toString());
        }

        let haveErrors = false;
        errors = {};
        setErrors({ ...errors });

        if (!formData.business_category) {
            errors["business_category"] = "Business category is required";
            haveErrors = true;
        }


        if (!formData.name) {
            errors["name"] = "Name is required";
            haveErrors = true;
        }

        if (!formData.name_in_arabic) {
            errors["name_in_arabic"] = "Name in arabic is required";
            haveErrors = true;
        }

        if (!formData.code) {
            errors["code"] = "Branch code is required";
            haveErrors = true;
        }

        if (!formData.branch_name) {
            errors["branch_name"] = "Branch name is required";
            haveErrors = true;
        }

        if (!formData.phone) {
            errors["phone"] = "Phone is required";
            haveErrors = true;
        }

        if (!formData.registration_number) {
            errors["registration_number"] = "CRN is required";
            haveErrors = true;
        } else if (!IsAlphanumeric(formData.registration_number)) {
            errors["registration_number"] = "CRN should be alpha numeric(a-zA-Z0-9)";
            haveErrors = true;
        }

        if (!formData.zipcode) {
            errors["zipcode"] = "Zipcode is required";
            haveErrors = true;
        } else {
            if (!isValidNDigitNumber(formData.zipcode, 5)) {
                errors["zipcode"] = "Zipcode should be 5 digits";
                haveErrors = true;
            }
        }

        if (!formData.vat_no) {
            errors["vat_no"] = "VAT No. is required";
            haveErrors = true;
        } else if (!isValidNDigitNumber(formData.vat_no, 15)) {
            errors["vat_no"] = "VAT No should be 15 digits";
            haveErrors = true;
        } else if (!NumberStartAndEndWith(formData.vat_no, 3)) {
            errors["vat_no"] = "VAT No should start and end with 3";
            haveErrors = true;
        }

        if (!formData.vat_percent) {
            errors["vat_percent"] = "VAT % is required";
            haveErrors = true;
        }

        if (!formData.email) {
            errors["email"] = "E-mail is required";
            haveErrors = true;
        } else if (!validateEmail(formData.email)) {
            errors["email"] = "E-mail is not valid";
            haveErrors = true;
        }

        if (!formData.address) {
            errors["address"] = "Address is required";
            haveErrors = true;
        }

        if (!formData.address_in_arabic) {
            errors["address_in_arabic"] = "Address in arabic is required";
            haveErrors = true;
        }

        if (!formData.logo && !formData.id) {
            errors["logo_content"] = "Logo is required";
            haveErrors = true;
        }





        if (!formData.national_address?.building_no) {
            errors["national_address_building_no"] = "Building number is required";
            haveErrors = true;
        } else {
            if (!isValidNDigitNumber(formData.national_address?.building_no, 4)) {
                errors["national_address_building_no"] = "Building number should be 4 digits";
                haveErrors = true;
            }
        }

        if (!formData.national_address?.street_name) {
            errors["national_address_street_name"] = "Street name is required";
            haveErrors = true;
        }

        if (!formData.national_address?.district_name) {
            errors["national_address_district_name"] = "District name is required";
            haveErrors = true;
        }

        if (!formData.national_address?.city_name) {
            errors["national_address_city_name"] = "City name is required";
            haveErrors = true;
        }

        if (!formData.national_address?.street_name_arabic) {
            errors["national_address_street_name_arabic"] = "Street name arabic is required";
            haveErrors = true;
        }

        if (!formData.national_address?.district_name_arabic) {
            errors["national_address_district_name_arabic"] = "District name arabic is required";
            haveErrors = true;
        }

        if (!formData.national_address?.city_name_arabic) {
            errors["national_address_city_name_arabic"] = "City name arabic is required";
            haveErrors = true;
        }



        if (!formData.national_address?.zipcode) {
            errors["national_address_zipcode"] = "Zip code is required";
            haveErrors = true;
        } else {
            if (!isValidNDigitNumber(formData.national_address?.zipcode, 5)) {
                errors["national_address_zipcode"] = "Zip code should be 5 digits";
                haveErrors = true;
            }
        }


        if (haveErrors) {
            setErrors({ ...errors });
            console.log("Errors: ", errors);
            return;
        }
        console.log("formData.logo:", formData.logo);

        deepFillEmptyStrings(formData.settings.invoice, invoiceSettings);

        let endPoint = "/v1/store";
        let method = "POST";
        if (formData.id) {
            endPoint = "/v1/store/" + formData.id;
            method = "PUT";
        }


        const requestOptions = {
            method: method,
            headers: {
                'Accept': 'application/json',
                "Content-Type": "application/json",
                Authorization: localStorage.getItem("access_token"),
            },
            body: JSON.stringify(formData),
        };

        console.log("formData:", formData);

        setProcessing(true);
        fetch(endPoint, requestOptions)
            .then(async (response) => {
                const isJson = response.headers
                    .get("content-type")
                    ?.includes("application/json");
                const data = isJson && (await response.json());

                // check for error response
                if (!response.ok) {
                    // get error message from body or default to response status
                    const error = data && data.errors;
                    //const error = data.errors
                    return Promise.reject(error);
                }

                setErrors({});
                setProcessing(false);

                console.log("Response:");
                console.log(data);

                const msg = formData.id ? "Store updated successfully!" : "Store created successfully!";
                showFlash(msg, "success");
                if (props.showToastMessage) props.showToastMessage(msg, "success");

                if (props.refreshList) {
                    props.refreshList();
                }
                if (localStorage.getItem("store_id")) {
                    if (localStorage.getItem("store_id") === data.result.id) {
                        localStorage.setItem("vat_percent", data.result.vat_percent);
                    }
                }

                handleClose();
                if (props.openDetailsView)
                    props.openDetailsView(data.result.id);
            })
            .catch((error) => {
                setProcessing(false);
                console.log("Inside catch");
                console.log(error);
                setErrors({ ...error });
                console.error("There was an error!", error);
                showFlash("Failed to save store. Please fix the errors and try again.", "danger");
                if (props.showToastMessage) props.showToastMessage("Failed to process store!", "danger");
            });
    }


    function getTargetDimension(originaleWidth, originalHeight, targetWidth, targetHeight) {

        let ratio = parseFloat(originaleWidth / originalHeight);

        targetWidth = parseInt(targetHeight * ratio);
        targetHeight = parseInt(targetWidth * ratio);

        return { targetWidth: targetWidth, targetHeight: targetHeight };
    }

    //let persianDigits = "۰۱۲۳۴۵۶۷۸۹";
    let persianDigits = "۰۱۲۳٤۵٦۷۸۹";
    let persianMap = persianDigits.split("");


    function convertToArabicNumber(input) {
        return input.replace(/\d/g, function (m) {
            return persianMap[parseInt(m)];
        });
    }


    //country
    const countryOptions = useMemo(() => countryList().getData(), [])
    //const [selectedCountry, setSelectedCountry] = useState('')
    let [selectedCountries, setSelectedCountries] = useState([]);

    const countrySearchRef = useRef();

    const NAV_TABS = [
        { id: 'general',        label: 'General Info',     icon: 'bi-building'          },
        { id: 'address',        label: 'National Address', icon: 'bi-geo-alt'           },
        { id: 'invoice_titles', label: 'Invoice Titles',   icon: 'bi-file-earmark-text' },
        { id: 'serial_numbers', label: 'Serial Numbers',   icon: 'bi-hash'              },
        { id: 'bank_account',   label: 'Bank Account',     icon: 'bi-bank'              },
        { id: 'settings',       label: 'Settings',         icon: 'bi-gear'              },
        { id: 'designs',        label: 'Designs',          icon: 'bi-palette'           },
        ...(formData.zatca?.phase === "2" ? [{ id: 'zatca_credentials', label: 'ZATCA Credentials', icon: 'bi-shield-lock' }] : []),
    ];
    const ERROR_TAB_MAP = {
        business_category: 'general', name: 'general', name_in_arabic: 'general',
        code: 'general', branch_name: 'general', phone: 'general', vat_no: 'general',
        vat_percent: 'general', email: 'general', address: 'general', address_in_arabic: 'general',
        country_code: 'general', registration_number: 'general', zipcode: 'general',
        logo_content: 'general',
        national_address_building_no: 'address', national_address_street_name: 'address',
        national_address_district_name: 'address', national_address_city_name: 'address',
        national_address_zipcode: 'address',
    };
    const getErrorTab = (key) => {
        if (ERROR_TAB_MAP[key]) return ERROR_TAB_MAP[key];
        if (key.startsWith('national_address_')) return 'address';
        if (key.startsWith('bank_')) return 'bank_account';
        return 'general';
    };
    const allErrors = Object.entries(errors).filter(([, v]) => v);
    const tabErrorCounts = NAV_TABS.reduce((acc, tab) => {
        acc[tab.id] = allErrors.filter(([k]) => getErrorTab(k) === tab.id).length;
        return acc;
    }, {});
    const totalErrors = allErrors.length;

    return (
        <>
            {flash && (
                <div style={{ position: 'fixed', top: '20px', right: '24px', zIndex: 99999, background: flash.type === 'success' ? '#dcfce7' : '#ffdad6', border: `1px solid ${flash.type === 'success' ? '#86efac' : '#f4adaa'}`, borderRadius: '8px', padding: '12px 18px', fontFamily: '"Inter", sans-serif', fontSize: '13px', fontWeight: 600, color: flash.type === 'success' ? '#15803d' : '#93000a', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 4px 16px rgba(0,0,0,0.14)', minWidth: '280px', maxWidth: '380px', animation: 'fadeInDown 0.2s ease' }}>
                    <i className={`bi ${flash.type === 'success' ? 'bi-check-circle-fill' : 'bi-exclamation-circle-fill'}`} style={{ fontSize: '16px', flexShrink: 0 }}></i>
                    <span style={{ flex: 1 }}>{flash.text}</span>
                    <button type="button" onClick={() => setFlash(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: '18px', lineHeight: 1, padding: 0, marginLeft: '4px', opacity: 0.7 }}>×</button>
                </div>
            )}
            <Modal show={show} size="xl" fullscreen onHide={handleClose} animation={false} backdrop="static" scrollable={true} dialogClassName="pw-modal">
                <Modal.Header style={{ background: '#ffffff', borderBottom: '1px solid #c3c6d7', padding: '10px 20px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button type="button" onClick={handleClose}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#434655', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '13px', fontWeight: 600, fontFamily: '"Inter", sans-serif', padding: '4px 8px', borderRadius: '4px', flexShrink: 0 }}
                        onMouseEnter={e => e.currentTarget.style.background = '#f0f2f4'}
                        onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                        <i className="bi bi-arrow-left" style={{ fontSize: '16px' }}></i> Back
                    </button>
                    <Modal.Title style={{ fontFamily: '"Hanken Grotesk", sans-serif', fontSize: '17px', fontWeight: 700, color: '#191c1e', letterSpacing: '-0.01em', flex: 1 }}>
                        {formData.id ? `Update Store — ${formData.name}` : 'Create New Store'}
                    </Modal.Title>
                    <div className="d-flex align-items-center gap-2">
                        {formData.id && (
                            <button type="button"
                                style={{ background: '#d0e1fb', color: '#54647a', border: 'none', borderRadius: '4px', padding: '6px 14px', fontSize: '13px', fontWeight: 600, fontFamily: '"Inter", sans-serif', cursor: 'pointer' }}
                                onClick={() => { handleClose(); if (props.openDetailsView) props.openDetailsView(formData.id); }}>
                                <i className="bi bi-eye me-1"></i>View Detail
                            </button>
                        )}
                        <button type="button"
                            style={{ background: '#004ac6', color: '#ffffff', border: 'none', borderRadius: '4px', padding: '6px 18px', fontSize: '13px', fontWeight: 600, fontFamily: '"Inter", sans-serif', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                            onClick={handleCreate} disabled={isProcessing}>
                            {isProcessing && <Spinner as="span" animation="border" size="sm" role="status" aria-hidden={true} />}
                            {formData.id ? 'Update' : 'Create'}
                        </button>
                        <button type="button" className="btn-close ms-1" onClick={handleClose} aria-label="Close" />
                    </div>
                </Modal.Header>
                <style>{`
                    @keyframes fadeInDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
                    .pw-modal .modal-content { display: flex; flex-direction: column; height: 100%; }
                    .pw-body { padding: 0 !important; overflow: hidden !important; display: flex !important; flex-direction: column !important; flex: 1 !important; min-height: 0 !important; }
                    .pw-form { display: flex; width: 100%; flex: 1; min-height: 0; }
                    .pw-sidebar { width: 210px; background: #f2f4f6; border-right: 1px solid #c3c6d7; padding: 16px 10px; flex-shrink: 0; overflow-y: auto; display: flex; flex-direction: column; gap: 4px; }
                    .pw-sidebar-header { margin-bottom: 16px; }
                    .pw-content { flex: 1; display: flex; flex-direction: column; background: #f7f9fb; min-width: 0; overflow: hidden; }
                    .pw-content-scroll { flex: 1; overflow-y: auto; padding: 20px 28px; }
                    .pw-tab-wrap { max-width: 960px; }
                    .pw-card { background: #ffffff; border: 1px solid #c3c6d7; border-radius: 8px; padding: 24px; margin-bottom: 20px; }
                    /* ── Tablet (768–1100px) ── */
                    @media (min-width: 768px) and (max-width: 1100px) {
                        .pw-sidebar { width: 170px; padding: 12px 8px; }
                        .pw-sidebar button { font-size: 12px !important; padding: 8px 8px !important; }
                        .pw-content-scroll { padding: 16px 18px; }
                        .pw-tab-wrap { max-width: 100%; }
                        .pw-card { padding: 18px; }
                        .pw-check-grid { grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); }
                    }
                    /* ── Mobile (≤767px) ── */
                    @media (max-width: 767px) {
                        /* Layout */
                        .pw-form { flex-direction: column; }
                        .pw-sidebar {
                            width: 100%; height: auto;
                            flex-direction: row; overflow-x: auto; overflow-y: hidden;
                            border-right: none; border-bottom: 1px solid #c3c6d7;
                            padding: 6px 8px; gap: 4px; flex-shrink: 0;
                        }
                        .pw-sidebar-header { display: none; }
                        .pw-sidebar button { flex-shrink: 0; white-space: nowrap; font-size: 12px !important; padding: 7px 10px !important; border-radius: 20px !important; }
                        .pw-content { overflow: visible; }
                        .pw-content-scroll { padding: 12px 14px !important; overflow: visible; }
                        .pw-tab-wrap { max-width: 100%; }
                        /* Cards */
                        .pw-card { padding: 14px 12px !important; margin-bottom: 12px !important; }
                        /* Form fields full-width on mobile */
                        .pw-card .row.g-3 > [class*="col-"] { flex: 0 0 100% !important; max-width: 100% !important; }
                        .pw-card .row > [class*="col-"] { flex: 0 0 100% !important; max-width: 100% !important; }
                        /* Checkbox grid — 1 column */
                        .pw-check-grid { grid-template-columns: 1fr !important; }
                        /* WhatsApp row */
                        .pw-field input, .pw-field select, .pw-field textarea { font-size: 14px !important; padding: 9px 12px !important; }
                        /* Override 2-col override on mobile */
                        .pw-card .row.g-3 > .col-md-2,
                        .pw-card .row.g-3 > .col-md-1 { flex: 0 0 100% !important; max-width: 100% !important; }
                        /* Modal header compact */
                        .pw-modal .modal-header { padding: 8px 12px !important; gap: 8px !important; flex-wrap: wrap; }
                        .pw-modal .modal-title { font-size: 14px !important; }
                        .pw-modal .d-flex.align-items-center.gap-2 { gap: 6px !important; }
                        .pw-modal .d-flex.align-items-center.gap-2 button { padding: 5px 10px !important; font-size: 12px !important; }
                    }
                    /* ── Small mobile (≤420px) ── */
                    @media (max-width: 420px) {
                        .pw-sidebar button { font-size: 11px !important; padding: 6px 8px !important; }
                        .pw-card { padding: 12px 10px !important; }
                        .pw-group-title { font-size: 11px; }
                        .pw-check span { font-size: 13px; }
                    }
                    /* ── Field overrides ── */
                    .pw-form input.form-control,
                    .pw-form select.form-control,
                    .pw-form textarea.form-control {
                        border: 1px solid #c3c6d7 !important; border-radius: 4px !important;
                        padding: 7px 12px !important; font-size: 13px !important;
                        font-family: "Inter", sans-serif !important; color: #191c1e !important;
                        background: #fff !important; box-shadow: none !important; width: 100% !important;
                    }
                    .pw-form input.form-control:focus,
                    .pw-form select.form-control:focus,
                    .pw-form textarea.form-control:focus {
                        border-color: #004ac6 !important;
                        box-shadow: 0 0 0 3px rgba(0,74,198,0.12) !important;
                        outline: none !important;
                    }
                    .pw-form label.form-label {
                        font-family: "Inter", sans-serif !important; font-size: 12px !important;
                        font-weight: 600 !important; color: #434655 !important;
                        margin-bottom: 5px !important; display: block;
                    }
                    .pw-form .input-group.mb-3 { margin-bottom: 0 !important; flex-wrap: nowrap; }
                    .pw-form .input-group > .form-control { border-radius: 4px !important; }
                    .pw-form .input-group-text {
                        border: 1px solid #c3c6d7; background: #f2f4f6;
                        font-size: 13px; font-family: "Inter", sans-serif;
                    }
                    /* ── Setting checkbox toggle ── */
                    .pw-check {
                        display: flex; align-items: flex-start; gap: 10px;
                        padding: 8px 10px; border-radius: 6px; cursor: pointer;
                        transition: background 0.12s; user-select: none; width: 100%;
                        border: none; background: transparent; text-align: left;
                    }
                    .pw-check:hover { background: #f0f2f4; }
                    .pw-check input[type="checkbox"] {
                        width: 15px; height: 15px; flex-shrink: 0; margin-top: 1px;
                        cursor: pointer; accent-color: #004ac6;
                    }
                    .pw-check span { font-family: "Inter", sans-serif; font-size: 13px; color: #191c1e; line-height: 18px; }
                    /* ── Setting group heading ── */
                    .pw-group-title {
                        font-family: "Hanken Grotesk", sans-serif; font-size: 12px; font-weight: 700;
                        color: #434655; text-transform: uppercase; letter-spacing: 0.07em;
                        padding-bottom: 10px; margin-bottom: 8px;
                        border-bottom: 1px solid #e0e3e5;
                        display: flex; align-items: center; gap: 6px;
                    }
                    .pw-check-grid {
                        display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 2px;
                    }
                    /* ── Inline styled field ── */
                    .pw-field { display: flex; flex-direction: column; gap: 4px; }
                    .pw-field label { font-family: "Inter", sans-serif; font-size: 12px; font-weight: 600; color: #434655; }
                    .pw-field input, .pw-field select, .pw-field textarea {
                        border: 1px solid #c3c6d7; border-radius: 4px; padding: 7px 12px;
                        font-size: 13px; font-family: "Inter", sans-serif; color: #191c1e;
                        background: #fff; outline: none; width: 100%;
                    }
                    .pw-field input:focus, .pw-field select:focus { border-color: #004ac6; box-shadow: 0 0 0 3px rgba(0,74,198,0.12); }
                    .pw-field small { font-size: 11px; color: #6b7280; font-family: "Inter", sans-serif; }
                    .pw-err { color: #ba1a1a; font-family: "Inter", sans-serif; font-size: 12px; margin-top: 3px; display: flex; align-items: center; gap: 4px; }
                    /* Widen excessively narrow 2-col fields inside pw-cards */
                    @media (min-width: 768px) {
                        .pw-card .row.g-3 > .col-md-2 { flex: 0 0 25%; max-width: 25%; }
                        .pw-card .row.g-3 > .col-md-1 { flex: 0 0 16.666%; max-width: 16.666%; }
                    }
                    /* Section dividers inside cards */
                    .pw-card > .row.g-3 > [class*="col-"] {
                        display: flex; flex-direction: column; gap: 4px;
                    }
                    .pw-card > .row.g-3 > [class*="col-"] > .input-group.mb-3 { gap: 0; }
                    /* Serial number sub-headers */
                    .pw-card h6 { font-family: "Hanken Grotesk", sans-serif; font-size: 13px; font-weight: 700; color: #191c1e; margin: 12px 0 8px; }
                    .pw-card h6 b { font-weight: 700; }
                    .pw-card > .row > [class*="col-"] > .input-group.mb-3 { margin-bottom: 0 !important; }
                `}</style>
                <Modal.Body className="pw-body">
                    <form onSubmit={handleCreate} className="pw-form">
                        <aside className="pw-sidebar">
                            <div className="pw-sidebar-header">
                                <div style={{ fontFamily: '"Hanken Grotesk", sans-serif', fontSize: '15px', fontWeight: 700, color: '#191c1e', marginBottom: '2px' }}>{formData.id ? 'Edit Store' : 'New Store'}</div>
                                <div style={{ fontFamily: '"Inter", sans-serif', fontSize: '11px', color: '#434655' }}>Store Wizard</div>
                            </div>
                            {NAV_TABS.map((tab) => (
                                <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)}
                                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 10px', borderRadius: '6px', border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%', background: activeTab === tab.id ? '#2563eb' : 'transparent', color: activeTab === tab.id ? '#eeefff' : '#434655', fontFamily: '"Inter", sans-serif', fontSize: '13px', fontWeight: activeTab === tab.id ? 700 : 500 }}
                                    onMouseEnter={(e) => { if (activeTab !== tab.id) e.currentTarget.style.background = '#e0e3e5'; }}
                                    onMouseLeave={(e) => { if (activeTab !== tab.id) e.currentTarget.style.background = 'transparent'; }}>
                                    <i className={`bi ${tab.icon}`} style={{ fontSize: '15px', flexShrink: 0 }}></i>
                                    <span style={{ flex: 1 }}>{tab.label}</span>
                                    {tabErrorCounts[tab.id] > 0 && (
                                        <span style={{ background: '#ba1a1a', color: '#fff', borderRadius: '50%', width: '18px', height: '18px', fontSize: '10px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                            {tabErrorCounts[tab.id]}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </aside>
                        <div className="pw-content">
                        <div className="pw-content-scroll">
                        <div style={{ overflow: 'hidden', maxHeight: totalErrors > 0 ? '500px' : '0', marginBottom: totalErrors > 0 ? '16px' : '0', transition: 'max-height 0.25s ease, margin-bottom 0.2s ease' }}>
                            <div style={{ background: '#ffdad6', border: '1px solid #f4adaa', borderRadius: '8px', padding: '12px 16px' }}>
                                <div style={{ fontFamily: '"Inter", sans-serif', fontWeight: 700, color: '#93000a', marginBottom: '8px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <i className="bi bi-exclamation-circle-fill" style={{ fontSize: '14px' }}></i>
                                    {totalErrors} error{totalErrors > 1 ? 's' : ''} — please fix before saving:
                                </div>
                                {NAV_TABS.map((tab) => {
                                    const tabErrs = allErrors.filter(([k]) => getErrorTab(k) === tab.id);
                                    if (!tabErrs.length) return null;
                                    return (
                                        <div key={tab.id} style={{ marginBottom: '6px' }}>
                                            <button type="button" onClick={() => setActiveTab(tab.id)} style={{ background: 'none', border: 'none', padding: 0, fontFamily: '"Inter", sans-serif', fontWeight: 700, color: '#004ac6', cursor: 'pointer', fontSize: '12px', textDecoration: 'underline', display: 'block', marginBottom: '2px' }}>
                                                {tab.label}:
                                            </button>
                                            {tabErrs.map(([k, v]) => (
                                                <div key={k} style={{ fontFamily: '"Inter", sans-serif', fontSize: '12px', color: '#93000a', paddingLeft: '10px' }}>• {v}</div>
                                            ))}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                        {activeTab === 'general' && (<div className="pw-tab-wrap"><div className="pw-card">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}><i className="bi bi-building" style={{ fontSize: '18px', color: '#004ac6' }}></i><h3 style={{ fontFamily: '"Hanken Grotesk", sans-serif', fontSize: '16px', fontWeight: 600, color: '#191c1e', margin: 0 }}>General Details</h3></div>
                        <div className="row g-3">

                        <div className="col-md-3">
                            <label className="form-label">Customer Package</label>
                            <div className="input-group mb-3">
                                <select
                                    className="form-control"
                                    value={formData.customer_package_id || ""}
                                    onChange={(e) => {
                                        formData.customer_package_id = e.target.value || null;
                                        setFormData({ ...formData });
                                    }}
                                >
                                    <option value="">— No Package —</option>
                                    {customerPackages.map(pkg => (
                                        <option key={pkg.id} value={pkg.id}>{pkg.name}</option>
                                    ))}
                                </select>
                            </div>
                            {formData.customer_package_id && (
                                <div style={{ fontSize: '12px', color: '#6b7280', fontFamily: 'Inter, sans-serif', marginTop: '-8px' }}>
                                    Non-admin users will only see tabs defined in this package.
                                </div>
                            )}
                        </div>

                        <div className="col-md-2">
                            <label className="form-label">Zatca phase*</label>

                            <div className="input-group mb-3">
                                <select
                                    value={formData.zatca?.phase}
                                    onChange={(e) => {
                                        console.log("Inside onchange payment method");
                                        if (!e.target.value) {
                                            formData.zatca.phase = "";
                                            errors["zatca_phase"] = "Invalid Phase";
                                            setErrors({ ...errors });
                                            return;
                                        }

                                        errors["zatca_phase"] = "";
                                        setErrors({ ...errors });

                                        formData.zatca.phase = e.target.value;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                >
                                    <option value="1">Phase 1</option>
                                    <option value="2">Phase 2</option>

                                </select>
                            </div>
                            {errors.zatca_phase && (
                                <div className="pw-err">
                                    {errors.zatca_phase}
                                </div>
                            )}
                        </div>
                        {formData.zatca?.phase === "2" ? <div className="col-md-2">
                            <label className="form-label">Zatca environment*</label>
                            <div className="input-group mb-3">
                                <select
                                    value={formData.zatca?.env}
                                    onChange={(e) => {
                                        console.log("Inside onchange payment method");
                                        if (!e.target.value) {
                                            formData.zatca.env = "";
                                            errors["zatca_env"] = "Invalid Env.";
                                            setErrors({ ...errors });
                                            return;
                                        }

                                        errors["zatca_env"] = "";
                                        setErrors({ ...errors });

                                        formData.zatca.env = e.target.value;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    disabled
                                >
                                    <option value="NonProduction">NonProduction</option>
                                    <option value="Simulation" >Simulation</option>
                                    <option value="Production" >Production</option>
                                </select>
                            </div>
                            {errors.zatca_env && (
                                <div className="pw-err">
                                    {errors.zatca_env}
                                </div>
                            )}
                        </div> : ""}

                        <div className="col-md-2">
                            <label className="form-label">Business category*</label>

                            <div className="input-group mb-3">
                                <input
                                    value={formData.business_category}
                                    type='string'
                                    onChange={(e) => {
                                        errors["business_category"] = "";
                                        setErrors({ ...errors });
                                        formData.business_category = e.target.value;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="business_category"
                                    placeholder="Business category"
                                />
                            </div>
                            {errors.business_category && (
                                <div className="pw-err">
                                    {errors.business_category}
                                </div>
                            )}
                        </div>


                        <div className="col-md-4">
                            <label className="form-label">Name*</label>

                            <div className="input-group mb-3">
                                <input
                                    value={formData.name ? formData.name : ""}
                                    type='string'
                                    onChange={(e) => {
                                        errors["name"] = "";
                                        setErrors({ ...errors });
                                        formData.name = e.target.value;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="name"
                                    placeholder="Name"
                                />
                            </div>
                            {errors.name && (
                                <div className="pw-err">
                                    {errors.name}
                                </div>
                            )}
                        </div>

                        <div className="col-md-4">
                            <label className="form-label">Name In Arabic*</label>

                            <div className="input-group mb-3">
                                <input
                                    value={formData.name_in_arabic ? formData.name_in_arabic : ""}
                                    type='string'
                                    onChange={(e) => {
                                        errors["v"] = "";
                                        setErrors({ ...errors });
                                        formData.name_in_arabic = e.target.value;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="name_in_arabic"
                                    placeholder="Name In Arabic"
                                />
                            </div>
                            {errors.name_in_arabic && (
                                <div className="pw-err">
                                    {errors.name_in_arabic}
                                </div>
                            )}
                        </div>


                        <div className="col-md-2">
                            <label className="form-label">Branch Code*</label>

                            <div className="input-group mb-3">
                                <input
                                    value={formData.code ? formData.code : ""}
                                    type='string'
                                    onChange={(e) => {
                                        errors["code"] = "";
                                        setErrors({ ...errors });


                                        if (!formData.id) {
                                            if (formData.code) {
                                                formData.sales_serial_number.prefix = formData.sales_serial_number.prefix.replace("-" + formData.code.toUpperCase(), "");

                                            }

                                            if (e.target.value) {

                                            }
                                        }




                                        formData.code = e.target.value;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="code"
                                    placeholder="Code"
                                />


                            </div>
                            {errors.code && (
                                <div className="pw-err">
                                    {errors.code}
                                </div>
                            )}
                        </div>

                        <div className="col-md-2">
                            <label className="form-label">Branch Name*</label>

                            <div className="input-group mb-3">
                                <input
                                    value={formData.branch_name}
                                    type='string'
                                    onChange={(e) => {
                                        errors["branch_name"] = "";
                                        setErrors({ ...errors });
                                        formData.branch_name = e.target.value;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="branch_name"
                                    placeholder="Branch Name"
                                />


                            </div>
                            {errors.branch_name && (
                                <div className="pw-err">
                                    {errors.branch_name}
                                </div>
                            )}
                        </div>

                        <div className="col-md-2">
                            <label className="form-label">Title(Optional)</label>

                            <div className="input-group mb-3">
                                <input
                                    value={formData.title ? formData.title : ""}
                                    type='string'
                                    onChange={(e) => {
                                        errors["title"] = "";
                                        setErrors({ ...errors });
                                        formData.title = e.target.value;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="title"
                                    placeholder="Title"
                                />

                            </div>
                            {errors.title && (
                                <div className="pw-err">

                                    {errors.title}
                                </div>
                            )}
                        </div>

                        <div className="col-md-2">
                            <label className="form-label">Title In Arabic(Optional)</label>

                            <div className="input-group mb-3">
                                <input
                                    value={formData.title_in_arabic ? formData.title_in_arabic : ""}
                                    type='string'
                                    onChange={(e) => {
                                        errors["title_in_arabic"] = "";
                                        setErrors({ ...errors });
                                        formData.title_in_arabic = e.target.value;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="title_in_arabic"
                                    placeholder="Title In Arabic"
                                />


                            </div>
                            {errors.title_in_arabic && (
                                <div className="pw-err">

                                    {errors.title_in_arabic}
                                </div>
                            )}
                        </div>

                        {/*<div className="col-md-4">
                            <label className="form-label">Use products from other stores(Optional)</label>

                            <div className="input-group mb-3">
                                <Typeahead
                                    id="use_products_from_store_id"
                                  
                                    labelKey="name"
                                    isInvalid={errors.use_products_from_store_id ? true : false}
                                    onChange={(selectedItems) => {
                                        errors.use_products_from_store_id = "";
                                        setErrors(errors);
                                        if (selectedItems.length === 0) {
                                            // errors.use_products_from_store_id = "Invalid store selected";
                                            //setErrors(errors);
                                            //setFormData({ ...formData });
                                            setSelectedStores([]);
                                            return;
                                        }
                                        //setFormData({ ...formData });
                                        setSelectedStores(selectedItems);
                                    }}
                                    options={storeOptions}
                                    placeholder="Select Stores"
                                    selected={selectedStores}
                                    highlightOnlyResult={true}
                                    onInputChange={(searchTerm, e) => {
                                        suggestStores(searchTerm);
                                    }}
                                    multiple
                                />


                            </div>
                            {errors.use_products_from_store_id && (
                                <div className="pw-err">

                                    {errors.use_products_from_store_id}
                                </div>
                            )}
                        </div>*/}

                        <div className="col-md-2">
                            <label className="form-label">Registration Number(CRN)*</label>

                            <div className="input-group mb-3">
                                <input
                                    value={formData.registration_number ? formData.registration_number : ""}
                                    type='string'
                                    onChange={(e) => {
                                        errors["registration_number"] = "";
                                        setErrors({ ...errors });
                                        formData.registration_number = e.target.value;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="registration_number"
                                    placeholder="CRN"
                                />


                            </div>
                            {errors.registration_number && (
                                <div className="pw-err">

                                    {errors.registration_number}
                                </div>
                            )}
                        </div>


                        <div className="col-md-2">
                            <label className="form-label">Zipcode*(5 digits)</label>

                            <div className="input-group mb-3">
                                <input
                                    value={formData.zipcode ? formData.zipcode : ""}
                                    type='number'
                                    onChange={(e) => {
                                        errors["zipcode"] = "";
                                        setErrors({ ...errors });
                                        formData.zipcode = e.target.value;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="zipcode"
                                    placeholder="Zipcode"
                                />


                            </div>
                            {errors.zipcode && (
                                <div className="pw-err">
                                    {errors.zipcode}
                                </div>
                            )}
                        </div>

                        <div className="col-md-2">
                            <label className="form-label">Phone* ( 05.. / +966..)</label>

                            <div className="input-group mb-3">
                                <input
                                    value={formData.phone ? formData.phone : ""}
                                    type='string'
                                    onChange={(e) => {
                                        errors["phone"] = "";
                                        setErrors({ ...errors });
                                        formData.phone = e.target.value;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="phone"
                                    placeholder="Phone"
                                />


                            </div>
                            {errors.phone && (
                                <div className="pw-err">

                                    {errors.phone}
                                </div>
                            )}
                        </div>


                        <div className="col-md-2">
                            <label className="form-label">VAT NO.* (15 digits)</label>

                            <div className="input-group mb-3">
                                <input
                                    value={formData.vat_no ? formData.vat_no : ""}
                                    type='string'
                                    onChange={(e) => {
                                        errors["vat_no"] = "";
                                        setErrors({ ...errors });
                                        formData.vat_no = e.target.value;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="vat_no"
                                    placeholder="VAT NO."
                                />


                            </div>
                            {errors.vat_no && (
                                <div className="pw-err">

                                    {errors.vat_no}
                                </div>
                            )}
                        </div>

                        <div className="col-md-1">
                            <label className="form-label">VAT %*</label>

                            <div className="input-group mb-3">
                                <input
                                    value={formData.vat_percent ? formData.vat_percent : ""}
                                    type='number'
                                    onChange={(e) => {
                                        errors["vat_percent"] = "";
                                        setErrors({ ...errors });

                                        if (isNaN(e.target.value)) {
                                            errors["vat_percent"] = "Invalid Discount";
                                            setErrors({ ...errors });
                                            return;
                                        }

                                        formData.vat_percent = e.target.value;

                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="vat_percent"
                                    placeholder="%"
                                />


                            </div>
                            {errors.vat_percent && (
                                <div className="pw-err">

                                    {errors.vat_percent}
                                </div>
                            )}
                        </div>

                        <div className="col-md-3">
                            <label className="form-label">Email*</label>

                            <div className="input-group mb-3">
                                <input
                                    value={formData.email ? formData.email : ""}
                                    type='string'
                                    onChange={(e) => {
                                        errors["email"] = "";

                                        formData.email = e.target.value;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="email"
                                    placeholder="Email"
                                />



                            </div>
                            {errors.email && (
                                <div className="pw-err">

                                    {errors.email}
                                </div>
                            )}
                        </div>

                        <div className="col-md-3">
                            <label className="form-label">Address*</label>

                            <div className="input-group mb-3">
                                <textarea
                                    value={formData.address}
                                    type='string'
                                    onChange={(e) => {
                                        errors["address"] = "";
                                        setErrors({ ...errors });
                                        formData.address = e.target.value;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="address"
                                    placeholder="Address"
                                />

                            </div>
                            {errors.address && (
                                <div className="pw-err">

                                    {errors.address}
                                </div>
                            )}
                        </div>

                        <div className="col-md-3">
                            <label className="form-label">Address In Arabic*</label>

                            <div className="input-group mb-3">
                                <textarea
                                    value={formData.address_in_arabic}
                                    type='string'
                                    onChange={(e) => {
                                        errors["address_in_arabic"] = "";
                                        setErrors({ ...errors });
                                        formData.address_in_arabic = e.target.value;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="address_in_arabic"
                                    placeholder="Address In Arabic"
                                />

                            </div>
                            {errors.address_in_arabic && (
                                <div className="pw-err">

                                    {errors.address_in_arabic}
                                </div>
                            )}

                        </div>

                        <div className="col-md-3">
                            <label className="form-label">Country*</label>

                            <div className="input-group mb-3">
                                <Typeahead
                                    id="country_code"
                                    labelKey="label"
                                    onChange={(selectedItems) => {
                                        errors.country_code = "";
                                        setErrors(errors);
                                        if (selectedItems.length === 0) {
                                            errors.country_code = "Invalid country selected";
                                            setErrors(errors);
                                            formData.country_code = "";
                                            formData.country_name = "";
                                            setFormData({ ...formData });
                                            setSelectedCountries([]);
                                            return;
                                        }
                                        formData.country_code = selectedItems[0].value;
                                        formData.country_name = selectedItems[0].label;
                                        setFormData({ ...formData });
                                        setSelectedCountries(selectedItems);
                                    }}
                                    options={countryOptions}
                                    placeholder="Country name"
                                    selected={selectedCountries}
                                    highlightOnlyResult={true}
                                    ref={countrySearchRef}
                                    onKeyDown={(e) => {
                                        if (e.key === "Escape") {
                                            countrySearchRef.current?.clear();
                                        }
                                    }}
                                    onInputChange={(searchTerm, e) => {
                                        //suggestBrands(searchTerm);
                                    }}
                                />
                            </div>
                            {errors.country_code && (
                                <div className="pw-err">
                                    {errors.country_code}
                                </div>
                            )}
                        </div>

                        <div className="col-md-2">
                            <label className="form-label">Logo*</label>

                            {formData.logo && !formData.logo_content && (
                                <div className="mb-2">
                                    <img src={formData.logo} alt="Current logo" style={{ maxHeight: '60px', maxWidth: '100%', objectFit: 'contain' }} />
                                </div>
                            )}

                            <div className="input-group mb-3">
                                <input
                                    type='file'
                                    onChange={(e) => {
                                        errors["logo_content"] = "";
                                        setErrors({ ...errors });

                                        if (!e.target.value) {
                                            errors["logo_content"] = "Invalid Logo File";
                                            setErrors({ ...errors });
                                            return;
                                        }

                                        formData.logo = e.target.value;

                                        let file = document.querySelector('#logo').files[0];

                                        let targetHeight = 100;
                                        let targetWidth = 100;


                                        let url = URL.createObjectURL(file);
                                        let img = new Image();

                                        img.onload = function () {
                                            let originaleWidth = img.width;
                                            let originalHeight = img.height;

                                            let targetDimensions = getTargetDimension(originaleWidth, originalHeight, targetWidth, targetHeight);
                                            targetWidth = targetDimensions.targetWidth;
                                            targetHeight = targetDimensions.targetHeight;

                                            resizeFIle(file, targetWidth, targetHeight, (result) => {
                                                formData.logo_content = result;
                                                setFormData({ ...formData });

                                                console.log("formData.logo_content:", formData.logo_content);
                                            });
                                        };
                                        img.src = url;

                                        /*
                                        resizeFIle(file, (result) => {
                                            formData.logo_content = result;

                                            console.log("formData.logo_content:", formData.logo_content);

                                            setFormData({ ...formData });
                                        });
                                        */
                                    }}
                                    className="form-control"
                                    id="logo"
                                    placeholder="Logo"
                                />


                            </div>
                            {errors.logo_content && (
                                <div className="pw-err">

                                    {errors.logo_content}
                                </div>
                            )}
                        </div>

                        </div></div></div>)}
                        {activeTab === 'address' && (<div className="pw-tab-wrap"><div className="pw-card">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}><i className="bi bi-geo-alt" style={{ fontSize: '18px', color: '#004ac6' }}></i><h3 style={{ fontFamily: '"Hanken Grotesk", sans-serif', fontSize: '16px', fontWeight: 600, color: '#191c1e', margin: 0 }}>National Address</h3></div>
                        <div className="row g-3">
                        <div className="col-md-2">
                            <label className="form-label">Short code</label>

                            <div className="input-group mb-3">
                                <input
                                    value={formData.national_address.short_code ? formData.national_address.short_code : ""}
                                    type='string'
                                    onChange={(e) => {

                                        errors["national_address_short_code"] = "";
                                        formData.national_address.short_code = e.target.value;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="national_address.short_code "
                                    placeholder="Short code "
                                />
                            </div>
                            {errors.national_address_short_code && (
                                <div className="pw-err">

                                    {errors.national_address_short_code}
                                </div>
                            )}
                        </div>

                        <div className="col-md-2">
                            <label className="form-label">Building Number(4 digits)*</label>

                            <div className="input-group mb-3">
                                <input
                                    value={formData.national_address.building_no ? formData.national_address.building_no : ""}
                                    type='string'
                                    onChange={(e) => {

                                        errors["national_address_building_no"] = "";
                                        formData.national_address.building_no = e.target.value;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="national_address.building_no"
                                    placeholder="Building Number"
                                />
                            </div>
                            {errors.national_address_building_no && (
                                <div className="pw-err">

                                    {errors.national_address_building_no}
                                </div>
                            )}
                        </div>

                        <div className="col-md-2">
                            <label className="form-label">Street Name*</label>

                            <div className="input-group mb-3">
                                <input
                                    value={formData.national_address.street_name ? formData.national_address.street_name : ""}
                                    type='string'
                                    onChange={(e) => {

                                        errors["national_address_street_name"] = "";
                                        formData.national_address.street_name = e.target.value;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="national_address.street_name"
                                    placeholder="Street Name"
                                />



                            </div>
                            {errors.national_address_street_name && (
                                <div className="pw-err">
                                    {errors.national_address_street_name}
                                </div>
                            )}
                        </div>

                        <div className="col-md-2">
                            <label className="form-label">Street Name(Arabic)</label>

                            <div className="input-group mb-3">
                                <input
                                    value={formData.national_address.street_name_arabic ? formData.national_address.street_name_arabic : ""}
                                    type='string'
                                    onChange={(e) => {

                                        errors["national_address_street_name_arabic"] = "";
                                        formData.national_address.street_name_arabic = e.target.value;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="national_address.street_name_arabic"
                                    placeholder="Street Name(Arabic)"
                                />



                            </div>
                            {errors.national_address_street_name_arabic && (
                                <div className="pw-err">

                                    {errors.national_address_street_name_arabic}
                                </div>
                            )}
                        </div>


                        <div className="col-md-2">
                            <label className="form-label">District Name*</label>

                            <div className="input-group mb-3">
                                <input
                                    value={formData.national_address.district_name ? formData.national_address.district_name : ""}
                                    type='string'
                                    onChange={(e) => {

                                        errors["national_address_district_name"] = "";
                                        formData.national_address.district_name = e.target.value;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="national_address.district_name"
                                    placeholder="District Name"
                                />



                            </div>
                            {errors.national_address_district_name && (
                                <div className="pw-err">

                                    {errors.national_address_district_name}
                                </div>
                            )}
                        </div>

                        <div className="col-md-2">
                            <label className="form-label">District Name(Arabic)</label>

                            <div className="input-group mb-3">
                                <input
                                    value={formData.national_address.district_name_arabic ? formData.national_address.district_name_arabic : ""}
                                    type='string'
                                    onChange={(e) => {

                                        errors["national_address_district_name_arabic"] = "";
                                        formData.national_address.district_name_arabic = e.target.value;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="national_address.district_name_arabic"
                                    placeholder="District Name(Arabic)"
                                />


                            </div>
                            {errors.national_address_district_name_arabic && (
                                <div className="pw-err">

                                    {errors.national_address_district_name_arabic}
                                </div>
                            )}

                        </div>


                        <div className="col-md-2">
                            <label className="form-label">City Name*</label>

                            <div className="input-group mb-3">
                                <input
                                    value={formData.national_address.city_name ? formData.national_address.city_name : ""}
                                    type='string'
                                    onChange={(e) => {

                                        errors["national_address_city_name"] = "";
                                        formData.national_address.city_name = e.target.value;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="national_address.city_name"
                                    placeholder="City Name"
                                />



                            </div>
                            {errors.national_address_city_name && (
                                <div className="pw-err">

                                    {errors.national_address_city_name}
                                </div>
                            )}
                        </div>

                        <div className="col-md-2">
                            <label className="form-label">City Name(Arabic)</label>

                            <div className="input-group mb-3">
                                <input
                                    value={formData.national_address.city_name_arabic ? formData.national_address.city_name_arabic : ""}
                                    type='string'
                                    onChange={(e) => {

                                        errors["national_address_city_name_arabic"] = "";
                                        formData.national_address.city_name_arabic = e.target.value;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="national_address.city_name_arabic"
                                    placeholder="City Name(Arabic)"
                                />



                            </div>
                            {errors.national_address_city_name_arabic && (
                                <div className="pw-err">

                                    {errors.national_address_city_name_arabic}
                                </div>
                            )}
                        </div>

                        <div className="col-md-2">
                            <label className="form-label">Zipcode(5 digits)*</label>

                            <div className="input-group mb-3">
                                <input
                                    value={formData.national_address.zipcode ? formData.national_address.zipcode : ""}
                                    type='string'
                                    onChange={(e) => {

                                        errors["national_address_zipcode"] = "";
                                        formData.national_address.zipcode = e.target.value;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="national_address.zipcode"
                                    placeholder="Zipcode"
                                />



                            </div>
                            {errors.national_address_zipcode && (
                                <div className="pw-err">

                                    {errors.national_address_zipcode}
                                </div>
                            )}
                        </div>

                        <div className="col-md-2">
                            <label className="form-label">Additional Number</label>

                            <div className="input-group mb-3">
                                <input
                                    value={formData.national_address.additional_no ? formData.national_address.additional_no : ""}
                                    type='string'
                                    onChange={(e) => {

                                        errors["national_address_additional_no"] = "";
                                        formData.national_address.additional_no = e.target.value;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="national_address.additional_no"
                                    placeholder="Additional Number"
                                />



                            </div>
                            {errors.national_address_additional_no && (
                                <div className="pw-err">

                                    {errors.national_address_additional_no}
                                </div>
                            )}
                        </div>

                        <div className="col-md-2">
                            <label className="form-label">Unit Number</label>

                            <div className="input-group mb-3">
                                <input
                                    value={formData.national_address.unit_no ? formData.national_address.unit_no : ""}
                                    type='string'
                                    onChange={(e) => {

                                        errors["national_address_unit_no"] = "";
                                        formData.national_address.unit_no = e.target.value;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="national_address.unit_no"
                                    placeholder="Unit Number"
                                />



                            </div>
                            {errors.national_address_unit_no && (
                                <div className="pw-err">

                                    {errors.national_address_unit_no}
                                </div>
                            )}
                        </div>





                        </div></div></div>)}
                        {activeTab === 'invoice_titles' && (<div className="pw-tab-wrap"><div className="pw-card">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}><i className="bi bi-file-earmark-text" style={{ fontSize: '18px', color: '#004ac6' }}></i><h3 style={{ fontFamily: '"Hanken Grotesk", sans-serif', fontSize: '16px', fontWeight: 600, color: '#191c1e', margin: 0 }}>Invoice Titles</h3></div>
                        <h6><b>Zatca Phase 1 Invoice Titles</b></h6>
                        <h6><b>Sales</b></h6>
                        <div className="row">
                            <div className="col-md-4">
                                <label className="form-label">Paid*</label>
                                <div className="input-group mb-3">
                                    <input
                                        value={formData.settings?.invoice?.phase1?.sales_titles?.paid}
                                        type='string'
                                        onChange={(e) => {

                                            errors["settings_invoice_phase1_sales_titles_paid"] = "";
                                            formData.settings.invoice.phase1.sales_titles.paid = e.target.value;
                                            setFormData({ ...formData });
                                            console.log(formData);
                                        }}
                                        className="form-control"
                                        id="settings.invoice.phase1.sales_titles.paid"
                                        placeholder="Invoice title"
                                    />
                                </div>
                                {errors.settings?.invoice?.phase1?.sales_titles?.paid && (
                                    <div className="pw-err">
                                        {errors.settings.invoice.phase1.sales_titles.paid}
                                    </div>
                                )}
                            </div>
                            <div className="col-md-4">
                                <label className="form-label">Credit*</label>
                                <div className="input-group mb-3">
                                    <input
                                        value={formData.settings?.invoice?.phase1?.sales_titles?.credit}
                                        type='string'
                                        onChange={(e) => {

                                            errors["settings_invoice_phase1_sales_titles_credit"] = "";
                                            formData.settings.invoice.phase1.sales_titles.credit = e.target.value;
                                            setFormData({ ...formData });
                                            console.log(formData);
                                        }}
                                        className="form-control"
                                        id="settings.invoice.phase1.sales_titles.credit"
                                        placeholder="Invoice title"
                                    />
                                </div>
                                {errors.settings?.invoice?.phase1?.sales_titles?.credit && (
                                    <div className="pw-err">
                                        {errors.settings.invoice.phase1.sales_titles.credit}
                                    </div>
                                )}
                            </div>
                            <div className="col-md-4">
                                <label className="form-label">Cash*</label>
                                <div className="input-group mb-3">
                                    <input
                                        value={formData.settings?.invoice?.phase1?.sales_titles?.cash}
                                        type='string'
                                        onChange={(e) => {

                                            errors["settings_invoice_phase1_sales_titles_cash"] = "";
                                            formData.settings.invoice.phase1.sales_titles.cash = e.target.value;
                                            setFormData({ ...formData });
                                            console.log(formData);
                                        }}
                                        className="form-control"
                                        id="settings.invoice.phase1.sales_titles.cash"
                                        placeholder="Invoice title"
                                    />
                                </div>
                                {errors.settings?.invoice?.phase1?.sales_titles?.cash && (
                                    <div className="pw-err">
                                        {errors.settings.invoice.phase1.sales_titles.cash}
                                    </div>
                                )}
                            </div>
                        </div>

                        <h6><b>Sales Return</b></h6>
                        <div className="row">
                            <div className="col-md-4">
                                <label className="form-label">Paid*</label>
                                <div className="input-group mb-3">
                                    <input
                                        value={formData.settings?.invoice?.phase1?.sales_return_titles?.paid}
                                        type='string'
                                        onChange={(e) => {

                                            errors["settings_invoice_phase1_sales_return_titles_paid"] = "";
                                            formData.settings.invoice.phase1.sales_return_titles.paid = e.target.value;
                                            setFormData({ ...formData });
                                            console.log(formData);
                                        }}
                                        className="form-control"
                                        id="settings.invoice.phase1.sales_return_titles.paid"
                                        placeholder="Invoice title"
                                    />
                                </div>
                                {errors.settings?.invoice?.phase1?.sales_return_titles?.paid && (
                                    <div className="pw-err">
                                        {errors.settings.invoice.phase1.sales_return_titles.paid}
                                    </div>
                                )}
                            </div>
                            <div className="col-md-4">
                                <label className="form-label">Credit*</label>
                                <div className="input-group mb-3">
                                    <input
                                        value={formData.settings?.invoice?.phase1?.sales_return_titles?.credit}
                                        type='string'
                                        onChange={(e) => {

                                            errors["settings_invoice_phase1_sales_return_titles_credit"] = "";
                                            formData.settings.invoice.phase1.sales_return_titles.credit = e.target.value;
                                            setFormData({ ...formData });
                                            console.log(formData);
                                        }}
                                        className="form-control"
                                        id="settings.invoice.phase1.sales_return_titles.credit"
                                        placeholder="Invoice title"
                                    />
                                </div>
                                {errors.settings?.invoice?.phase1?.sales_return_titles?.credit && (
                                    <div className="pw-err">
                                        {errors.settings.invoice.phase1.sales_return_titles.credit}
                                    </div>
                                )}
                            </div>
                            <div className="col-md-4">
                                <label className="form-label">Cash*</label>
                                <div className="input-group mb-3">
                                    <input
                                        value={formData.settings?.invoice?.phase1?.sales_return_titles?.cash}
                                        type='string'
                                        onChange={(e) => {

                                            errors["settings_invoice_phase1_sales_return_titles_cash"] = "";
                                            formData.settings.invoice.phase1.sales_return_titles.cash = e.target.value;
                                            setFormData({ ...formData });
                                            console.log(formData);
                                        }}
                                        className="form-control"
                                        id="settings.invoice.phase1.sales_return_titles.cash"
                                        placeholder="Invoice title"
                                    />
                                </div>
                                {errors.settings?.invoice?.phase1?.sales_return_titles?.cash && (
                                    <div className="pw-err">
                                        {errors.settings.invoice.phase1.sales_return_titles.cash}
                                    </div>
                                )}
                            </div>
                        </div>


                        <h6><b>Purchase</b></h6>
                        <div className="row">
                            <div className="col-md-4">
                                <label className="form-label">Paid*</label>
                                <div className="input-group mb-3">
                                    <input
                                        value={formData.settings?.invoice?.phase1?.purchase_titles?.paid}
                                        type='string'
                                        onChange={(e) => {

                                            errors["settings_invoice_phase1_purchase_titles_paid"] = "";
                                            formData.settings.invoice.phase1.purchase_titles.paid = e.target.value;
                                            setFormData({ ...formData });
                                            console.log(formData);
                                        }}
                                        className="form-control"
                                        id="settings.invoice.phase1.purchase_titles.paid"
                                        placeholder="Invoice title"
                                    />
                                </div>
                                {errors.settings?.invoice?.phase1?.purchase_titles?.paid && (
                                    <div className="pw-err">
                                        {errors.settings.invoice.phase1.purchase_titles.paid}
                                    </div>
                                )}
                            </div>
                            <div className="col-md-4">
                                <label className="form-label">Credit*</label>
                                <div className="input-group mb-3">
                                    <input
                                        value={formData.settings?.invoice?.phase1?.purchase_titles?.credit}
                                        type='string'
                                        onChange={(e) => {

                                            errors["settings_invoice_phase1_purchase_titles_credit"] = "";
                                            formData.settings.invoice.phase1.purchase_titles.credit = e.target.value;
                                            setFormData({ ...formData });
                                            console.log(formData);
                                        }}
                                        className="form-control"
                                        id="settings.invoice.phase1.purchase_titles.credit"
                                        placeholder="Invoice title"
                                    />
                                </div>
                                {errors.settings?.invoice?.phase1?.purchase_titles?.credit && (
                                    <div className="pw-err">
                                        {errors.settings.invoice.phase1.purchase_titles.credit}
                                    </div>
                                )}
                            </div>
                            <div className="col-md-4">
                                <label className="form-label">Cash*</label>
                                <div className="input-group mb-3">
                                    <input
                                        value={formData.settings?.invoice?.phase1?.purchase_titles?.cash}
                                        type='string'
                                        onChange={(e) => {

                                            errors["settings_invoice_phase1_purchase_titles_cash"] = "";
                                            formData.settings.invoice.phase1.purchase_titles.cash = e.target.value;
                                            setFormData({ ...formData });
                                            console.log(formData);
                                        }}
                                        className="form-control"
                                        id="settings.invoice.phase1.purchase_titles.cash"
                                        placeholder="Invoice title"
                                    />
                                </div>
                                {errors.settings?.invoice?.phase1?.purchase_titles?.cash && (
                                    <div className="pw-err">
                                        {errors.settings.invoice.phase1.purchase_titles.cash}
                                    </div>
                                )}
                            </div>
                        </div>

                        <h6><b>Purchase Return</b></h6>
                        <div className="row">
                            <div className="col-md-4">
                                <label className="form-label">Paid*</label>
                                <div className="input-group mb-3">
                                    <input
                                        value={formData.settings?.invoice?.phase1?.purchase_return_titles?.paid}
                                        type='string'
                                        onChange={(e) => {

                                            errors["settings_invoice_phase1_purchase_return_titles_paid"] = "";
                                            formData.settings.invoice.phase1.purchase_return_titles.paid = e.target.value;
                                            setFormData({ ...formData });
                                            console.log(formData);
                                        }}
                                        className="form-control"
                                        id="settings.invoice.phase1.purchase_return_titles.paid"
                                        placeholder="Invoice title"
                                    />
                                </div>
                                {errors.settings?.invoice?.phase1?.purchase_return_titles?.paid && (
                                    <div className="pw-err">
                                        {errors.settings.invoice.phase1.purchase_return_titles.paid}
                                    </div>
                                )}
                            </div>
                            <div className="col-md-4">
                                <label className="form-label">Credit*</label>
                                <div className="input-group mb-3">
                                    <input
                                        value={formData.settings?.invoice?.phase1?.purchase_return_titles?.credit}
                                        type='string'
                                        onChange={(e) => {

                                            errors["settings_invoice_phase1_purchase_return_titles_credit"] = "";
                                            formData.settings.invoice.phase1.purchase_return_titles.credit = e.target.value;
                                            setFormData({ ...formData });
                                            console.log(formData);
                                        }}
                                        className="form-control"
                                        id="settings.invoice.phase1.purchase_return_titles.credit"
                                        placeholder="Invoice title"
                                    />
                                </div>
                                {errors.settings?.invoice?.phase1?.purchase_return_titles?.credit && (
                                    <div className="pw-err">
                                        {errors.settings.invoice.phase1.purchase_return_titles.credit}
                                    </div>
                                )}
                            </div>
                            <div className="col-md-4">
                                <label className="form-label">Cash*</label>
                                <div className="input-group mb-3">
                                    <input
                                        value={formData.settings?.invoice?.phase1?.purchase_return_titles?.cash}
                                        type='string'
                                        onChange={(e) => {

                                            errors["settings_invoice_phase1_purchase_return_titles_cash"] = "";
                                            formData.settings.invoice.phase1.purchase_return_titles.cash = e.target.value;
                                            setFormData({ ...formData });
                                            console.log(formData);
                                        }}
                                        className="form-control"
                                        id="settings.invoice.phase1.purchase_return_titles.cash"
                                        placeholder="Invoice title"
                                    />
                                </div>
                                {errors.settings?.invoice?.phase1?.purchase_return_titles?.cash && (
                                    <div className="pw-err">
                                        {errors.settings.invoice.phase1.purchase_return_titles.cash}
                                    </div>
                                )}
                            </div>
                        </div>


                        <h6><b>Zatca Phase 2 Invoice Titles</b></h6>
                        <h6><b>Sales</b></h6>
                        <div className="row">
                            <div className="col-md-4">
                                <label className="form-label">Paid B2C*</label>
                                <div className="input-group mb-3">
                                    <input
                                        value={formData.settings?.invoice?.phase2?.sales_titles?.paid}
                                        type='string'
                                        onChange={(e) => {

                                            errors["settings_invoice_phase2_sales_titles_paid"] = "";
                                            formData.settings.invoice.phase2.sales_titles.paid = e.target.value;
                                            setFormData({ ...formData });
                                            console.log(formData);
                                        }}
                                        className="form-control"
                                        id="settings.invoice.phase2.sales_titles.paid"
                                        placeholder="Invoice title"
                                    />
                                </div>
                                {errors.settings?.invoice?.phase2?.sales_titles?.paid && (
                                    <div className="pw-err">
                                        {errors.settings.invoice.phase2.sales_titles.paid}
                                    </div>
                                )}
                            </div>
                            <div className="col-md-4">
                                <label className="form-label">Credit B2C*</label>
                                <div className="input-group mb-3">
                                    <input
                                        value={formData.settings?.invoice?.phase2?.sales_titles?.credit}
                                        type='string'
                                        onChange={(e) => {

                                            errors["settings_invoice_phase2_sales_titles_credit"] = "";
                                            formData.settings.invoice.phase2.sales_titles.credit = e.target.value;
                                            setFormData({ ...formData });
                                            console.log(formData);
                                        }}
                                        className="form-control"
                                        id="settings.invoice.phase2.sales_titles.credit"
                                        placeholder="Invoice title"
                                    />
                                </div>
                                {errors.settings?.invoice?.phase2?.sales_titles?.credit && (
                                    <div className="pw-err">
                                        {errors.settings.invoice.phase2.sales_titles.credit}
                                    </div>
                                )}
                            </div>
                            <div className="col-md-4">
                                <label className="form-label">Cash B2C*</label>
                                <div className="input-group mb-3">
                                    <input
                                        value={formData.settings?.invoice?.phase2?.sales_titles?.cash}
                                        type='string'
                                        onChange={(e) => {

                                            errors["settings_invoice_phase2_sales_titles_cash"] = "";
                                            formData.settings.invoice.phase2.sales_titles.cash = e.target.value;
                                            setFormData({ ...formData });
                                            console.log(formData);
                                        }}
                                        className="form-control"
                                        id="settings.invoice.phase2.sales_titles.cash"
                                        placeholder="Invoice title"
                                    />
                                </div>
                                {errors.settings?.invoice?.phase2?.sales_titles?.cash && (
                                    <div className="pw-err">
                                        {errors.settings.invoice.phase2.sales_titles.cash}
                                    </div>
                                )}
                            </div>

                            <div className="col-md-4">
                                <label className="form-label">Paid B2B*</label>
                                <div className="input-group mb-3">
                                    <input
                                        value={formData.settings?.invoice?.phase2_b2b?.sales_titles?.paid}
                                        type='string'
                                        onChange={(e) => {

                                            errors["settings_invoice_phase2_b2b_sales_titles_paid"] = "";
                                            formData.settings.invoice.phase2_b2b.sales_titles.paid = e.target.value;
                                            setFormData({ ...formData });
                                            console.log(formData);
                                        }}
                                        className="form-control"
                                        id="settings.invoice.phase2_b2b.sales_titles.paid"
                                        placeholder="Invoice title"
                                    />
                                </div>
                                {errors.settings?.invoice?.phase2_b2b?.sales_titles?.paid && (
                                    <div className="pw-err">
                                        {errors.settings.invoice.phase2_b2b.sales_titles.paid}
                                    </div>
                                )}
                            </div>
                            <div className="col-md-4">
                                <label className="form-label">Credit B2B*</label>
                                <div className="input-group mb-3">
                                    <input
                                        value={formData.settings?.invoice?.phase2_b2b?.sales_titles?.credit}
                                        type='string'
                                        onChange={(e) => {

                                            errors["settings_invoice_phase2_b2b_sales_titles_credit"] = "";
                                            formData.settings.invoice.phase2_b2b.sales_titles.credit = e.target.value;
                                            setFormData({ ...formData });
                                            console.log(formData);
                                        }}
                                        className="form-control"
                                        id="settings.invoice.phase2_b2b.sales_titles.credit"
                                        placeholder="Invoice title"
                                    />
                                </div>
                                {errors.settings?.invoice?.phase2_b2b?.sales_titles?.credit && (
                                    <div className="pw-err">
                                        {errors.settings.invoice.phase2_b2b.sales_titles.credit}
                                    </div>
                                )}
                            </div>
                            <div className="col-md-4">
                                <label className="form-label">Cash B2B*</label>
                                <div className="input-group mb-3">
                                    <input
                                        value={formData.settings?.invoice?.phase2_b2b?.sales_titles?.cash}
                                        type='string'
                                        onChange={(e) => {

                                            errors["settings_invoice_phase2_b2b_sales_titles_cash"] = "";
                                            formData.settings.invoice.phase2_b2b.sales_titles.cash = e.target.value;
                                            setFormData({ ...formData });
                                            console.log(formData);
                                        }}
                                        className="form-control"
                                        id="settings.invoice.phase2_b2b.sales_titles.cash"
                                        placeholder="Invoice title"
                                    />
                                </div>
                                {errors.settings?.invoice?.phase2_b2b?.sales_titles?.cash && (
                                    <div className="pw-err">
                                        {errors.settings.invoice.phase2_b2b.sales_titles.cash}
                                    </div>
                                )}
                            </div>
                        </div>

                        <h6><b>Sales Return</b></h6>
                        <div className="row">
                            <div className="col-md-4">
                                <label className="form-label">Paid B2C*</label>
                                <div className="input-group mb-3">
                                    <input
                                        value={formData.settings?.invoice?.phase2?.sales_return_titles?.paid}
                                        type='string'
                                        onChange={(e) => {

                                            errors["settings_invoice_phase2_sales_return_titles_paid"] = "";
                                            formData.settings.invoice.phase2.sales_return_titles.paid = e.target.value;
                                            setFormData({ ...formData });
                                            console.log(formData);
                                        }}
                                        className="form-control"
                                        id="settings.invoice.phase2.sales_return_titles.paid"
                                        placeholder="Invoice title"
                                    />
                                </div>
                                {errors.settings?.invoice?.phase2?.sales_return_titles?.paid && (
                                    <div className="pw-err">
                                        {errors.settings.invoice.phase2.sales_return_titles.paid}
                                    </div>
                                )}
                            </div>
                            <div className="col-md-4">
                                <label className="form-label">Credit B2C*</label>
                                <div className="input-group mb-3">
                                    <input
                                        value={formData.settings?.invoice?.phase2?.sales_return_titles?.credit}
                                        type='string'
                                        onChange={(e) => {

                                            errors["settings_invoice_phase1_sales_return_titles_credit"] = "";
                                            formData.settings.invoice.phase2.sales_return_titles.credit = e.target.value;
                                            setFormData({ ...formData });
                                            console.log(formData);
                                        }}
                                        className="form-control"
                                        id="settings.invoice.phase2.sales_return_titles.credit"
                                        placeholder="Invoice title"
                                    />
                                </div>
                                {errors.settings?.invoice?.phase2?.sales_return_titles?.credit && (
                                    <div className="pw-err">
                                        {errors.settings.invoice.phase2.sales_return_titles.credit}
                                    </div>
                                )}
                            </div>
                            <div className="col-md-4">
                                <label className="form-label">Cash B2C*</label>
                                <div className="input-group mb-3">
                                    <input
                                        value={formData.settings?.invoice?.phase2?.sales_return_titles?.cash}
                                        type='string'
                                        onChange={(e) => {

                                            errors["settings_invoice_phase2_sales_return_titles_cash"] = "";
                                            formData.settings.invoice.phase2.sales_return_titles.cash = e.target.value;
                                            setFormData({ ...formData });
                                            console.log(formData);
                                        }}
                                        className="form-control"
                                        id="settings.invoice.phase2.sales_return_titles.cash"
                                        placeholder="Invoice title"
                                    />
                                </div>
                                {errors.settings?.invoice?.phase2?.sales_return_titles?.cash && (
                                    <div className="pw-err">
                                        {errors.settings.invoice.phase2.sales_return_titles.cash}
                                    </div>
                                )}
                            </div>

                            <div className="col-md-4">
                                <label className="form-label">Paid B2B*</label>
                                <div className="input-group mb-3">
                                    <input
                                        value={formData.settings?.invoice?.phase2_b2b?.sales_return_titles?.paid}
                                        type='string'
                                        onChange={(e) => {

                                            errors["settings_invoice_phase2_b2b_sales_return_titles_paid"] = "";
                                            formData.settings.invoice.phase2_b2b.sales_return_titles.paid = e.target.value;
                                            setFormData({ ...formData });
                                            console.log(formData);
                                        }}
                                        className="form-control"
                                        id="settings.invoice.phase2_b2b.sales_return_titles.paid"
                                        placeholder="Invoice title"
                                    />
                                </div>
                                {errors.settings?.invoice?.phase2_b2b?.sales_return_titles?.paid && (
                                    <div className="pw-err">
                                        {errors.settings.invoice.phase2_b2b.sales_return_titles.paid}
                                    </div>
                                )}
                            </div>
                            <div className="col-md-4">
                                <label className="form-label">Credit B2B*</label>
                                <div className="input-group mb-3">
                                    <input
                                        value={formData.settings?.invoice?.phase2_b2b?.sales_return_titles?.credit}
                                        type='string'
                                        onChange={(e) => {

                                            errors["settings_invoice_phase1_b2b_sales_return_titles_credit"] = "";
                                            formData.settings.invoice.phase2_b2b.sales_return_titles.credit = e.target.value;
                                            setFormData({ ...formData });
                                            console.log(formData);
                                        }}
                                        className="form-control"
                                        id="settings.invoice.phase2_b2b.sales_return_titles.credit"
                                        placeholder="Invoice title"
                                    />
                                </div>
                                {errors.settings?.invoice?.phase2_b2b?.sales_return_titles?.credit && (
                                    <div className="pw-err">
                                        {errors.settings.invoice.phase2_b2b.sales_return_titles.credit}
                                    </div>
                                )}
                            </div>
                            <div className="col-md-4">
                                <label className="form-label">Cash B2B*</label>
                                <div className="input-group mb-3">
                                    <input
                                        value={formData.settings?.invoice?.phase2_b2b?.sales_return_titles?.cash}
                                        type='string'
                                        onChange={(e) => {

                                            errors["settings_invoice_phase2_b2b_sales_return_titles_cash"] = "";
                                            formData.settings.invoice.phase2_b2b.sales_return_titles.cash = e.target.value;
                                            setFormData({ ...formData });
                                            console.log(formData);
                                        }}
                                        className="form-control"
                                        id="settings.invoice.phase2_b2b.sales_return_titles.cash"
                                        placeholder="Invoice title"
                                    />
                                </div>
                                {errors.settings?.invoice?.phase2_b2b?.sales_return_titles?.cash && (
                                    <div className="pw-err">
                                        {errors.settings.invoice.phase2_b2b.sales_return_titles.cash}
                                    </div>
                                )}
                            </div>

                        </div>


                        <h6><b>Purchase</b></h6>
                        <div className="row">
                            <div className="col-md-4">
                                <label className="form-label">Paid B2C*</label>
                                <div className="input-group mb-3">
                                    <input
                                        value={formData.settings?.invoice?.phase2?.purchase_titles?.paid}
                                        type='string'
                                        onChange={(e) => {

                                            errors["settings_invoice_phase2_purchase_titles_paid"] = "";
                                            formData.settings.invoice.phase2.purchase_titles.paid = e.target.value;
                                            setFormData({ ...formData });
                                            console.log(formData);
                                        }}
                                        className="form-control"
                                        id="settings.invoice.phase2.purchase_titles.paid"
                                        placeholder="Invoice title"
                                    />
                                </div>
                                {errors.settings?.invoice?.phase2?.purchase_titles?.paid && (
                                    <div className="pw-err">
                                        {errors.settings.invoice.phase2.purchase_titles.paid}
                                    </div>
                                )}
                            </div>
                            <div className="col-md-4">
                                <label className="form-label">Credit B2C*</label>
                                <div className="input-group mb-3">
                                    <input
                                        value={formData.settings?.invoice?.phase2?.purchase_titles?.credit}
                                        type='string'
                                        onChange={(e) => {

                                            errors["settings_invoice_phase2_purchase_titles_credit"] = "";
                                            formData.settings.invoice.phase2.purchase_titles.credit = e.target.value;
                                            setFormData({ ...formData });
                                            console.log(formData);
                                        }}
                                        className="form-control"
                                        id="settings.invoice.phase2.purchase_titles.credit"
                                        placeholder="Invoice title"
                                    />
                                </div>
                                {errors.settings?.invoice?.phase2?.purchase_titles?.credit && (
                                    <div className="pw-err">
                                        {errors.settings.invoice.phase2.purchase_titles.credit}
                                    </div>
                                )}
                            </div>
                            <div className="col-md-4">
                                <label className="form-label">Cash B2C*</label>
                                <div className="input-group mb-3">
                                    <input
                                        value={formData.settings?.invoice?.phase2?.purchase_titles?.cash}
                                        type='string'
                                        onChange={(e) => {

                                            errors["settings_invoice_phase2_purchase_titles_cash"] = "";
                                            formData.settings.invoice.phase2.purchase_titles.cash = e.target.value;
                                            setFormData({ ...formData });
                                            console.log(formData);
                                        }}
                                        className="form-control"
                                        id="settings.invoice.phase2.purchase_titles.cash"
                                        placeholder="Invoice title"
                                    />
                                </div>
                                {errors.settings?.invoice?.phase2?.purchase_titles?.cash && (
                                    <div className="pw-err">
                                        {errors.settings.invoice.phase2.purchase_titles.cash}
                                    </div>
                                )}
                            </div>

                            <div className="col-md-4">
                                <label className="form-label">Paid B2B*</label>
                                <div className="input-group mb-3">
                                    <input
                                        value={formData.settings?.invoice?.phase2_b2b?.purchase_titles?.paid}
                                        type='string'
                                        onChange={(e) => {

                                            errors["settings_invoice_phase2_b2b_purchase_titles_paid"] = "";
                                            formData.settings.invoice.phase2_b2b.purchase_titles.paid = e.target.value;
                                            setFormData({ ...formData });
                                            console.log(formData);
                                        }}
                                        className="form-control"
                                        id="settings.invoice.phase2_b2b.purchase_titles.paid"
                                        placeholder="Invoice title"
                                    />
                                </div>
                                {errors.settings?.invoice?.phase2_b2b?.purchase_titles?.paid && (
                                    <div className="pw-err">
                                        {errors.settings.invoice.phase2_b2b.purchase_titles.paid}
                                    </div>
                                )}
                            </div>
                            <div className="col-md-4">
                                <label className="form-label">Credit B2B*</label>
                                <div className="input-group mb-3">
                                    <input
                                        value={formData.settings?.invoice?.phase2_b2b?.purchase_titles?.credit}
                                        type='string'
                                        onChange={(e) => {

                                            errors["settings_invoice_phase2_b2b_purchase_titles_credit"] = "";
                                            formData.settings.invoice.phase2_b2b.purchase_titles.credit = e.target.value;
                                            setFormData({ ...formData });
                                            console.log(formData);
                                        }}
                                        className="form-control"
                                        id="settings.invoice.phase2_b2b.purchase_titles.credit"
                                        placeholder="Invoice title"
                                    />
                                </div>
                                {errors.settings?.invoice?.phase2_b2b?.purchase_titles?.credit && (
                                    <div className="pw-err">
                                        {errors.settings.invoice.phase2_b2b.purchase_titles.credit}
                                    </div>
                                )}
                            </div>
                            <div className="col-md-4">
                                <label className="form-label">Cash B2B*</label>
                                <div className="input-group mb-3">
                                    <input
                                        value={formData.settings?.invoice?.phase2_b2b?.purchase_titles?.cash}
                                        type='string'
                                        onChange={(e) => {

                                            errors["settings_invoice_phase2_b2b_purchase_titles_cash"] = "";
                                            formData.settings.invoice.phase2_b2b.purchase_titles.cash = e.target.value;
                                            setFormData({ ...formData });
                                            console.log(formData);
                                        }}
                                        className="form-control"
                                        id="settings.invoice.phase2_b2b.purchase_titles.cash"
                                        placeholder="Invoice title"
                                    />
                                </div>
                                {errors.settings?.invoice?.phase2_b2b?.purchase_titles?.cash && (
                                    <div className="pw-err">
                                        {errors.settings.invoice.phase2_b2b.purchase_titles.cash}
                                    </div>
                                )}
                            </div>
                        </div>

                        <h6><b>Purchase Return</b></h6>
                        <div className="row">
                            <div className="col-md-4">
                                <label className="form-label">Paid*</label>
                                <div className="input-group mb-">
                                    <input
                                        value={formData.settings?.invoice?.phase2?.purchase_return_titles?.paid}
                                        type='string'
                                        onChange={(e) => {

                                            errors["settings_invoice_phase1_purchase_return_titles_paid"] = "";
                                            formData.settings.invoice.phase2.purchase_return_titles.paid = e.target.value;
                                            setFormData({ ...formData });
                                            console.log(formData);
                                        }}
                                        className="form-control"
                                        id="settings.invoice.phase2.purchase_return_titles.paid"
                                        placeholder="Invoice title"
                                    />
                                </div>
                                {errors.settings?.invoice?.phase2?.purchase_return_titles?.paid && (
                                    <div className="pw-err">
                                        {errors.settings.invoice.phase2.purchase_return_titles.paid}
                                    </div>
                                )}
                            </div>
                            <div className="col-md-4">
                                <label className="form-label">Credit*</label>
                                <div className="input-group mb-3">
                                    <input
                                        value={formData.settings?.invoice?.phase2?.purchase_return_titles?.credit}
                                        type='string'
                                        onChange={(e) => {

                                            errors["settings_invoice_phase1_purchase_return_titles_credit"] = "";
                                            formData.settings.invoice.phase2.purchase_return_titles.credit = e.target.value;
                                            setFormData({ ...formData });
                                            console.log(formData);
                                        }}
                                        className="form-control"
                                        id="settings.invoice.phase2.purchase_return_titles.credit"
                                        placeholder="Invoice title"
                                    />
                                </div>
                                {errors.settings?.invoice?.phase2?.purchase_return_titles?.credit && (
                                    <div className="pw-err">
                                        {errors.settings.invoice.phase2.purchase_return_titles.credit}
                                    </div>
                                )}
                            </div>
                            <div className="col-md-4">
                                <label className="form-label">Cash*</label>
                                <div className="input-group mb-3">
                                    <input
                                        value={formData.settings?.invoice?.phase2?.purchase_return_titles?.cash}
                                        type='string'
                                        onChange={(e) => {

                                            errors["settings_invoice_phase2_purchase_return_titles_cash"] = "";
                                            formData.settings.invoice.phase2.purchase_return_titles.cash = e.target.value;
                                            setFormData({ ...formData });
                                            console.log(formData);
                                        }}
                                        className="form-control"
                                        id="settings.invoice.phase2.purchase_return_titles.cash"
                                        placeholder="Invoice title"
                                    />
                                </div>
                                {errors.settings?.invoice?.phase2?.purchase_return_titles?.cash && (
                                    <div className="pw-err">
                                        {errors.settings.invoice.phase2.purchase_return_titles.cash}
                                    </div>
                                )}
                            </div>
                        </div>

                        <h6><b>Other Invoice Titles</b></h6>
                        <div className="row">
                            <div className="col-md-4">
                                <label className="form-label">Quotation*</label>
                                <div className="input-group mb-3">
                                    <input
                                        value={formData.settings?.invoice?.quotation_title}
                                        type='string'
                                        onChange={(e) => {

                                            errors["settings_invoice_quotation_title"] = "";
                                            formData.settings.invoice.quotation_title = e.target.value;
                                            setFormData({ ...formData });
                                            console.log(formData);
                                        }}
                                        className="form-control"
                                        id="settings.invoice.quotation_titled"
                                        placeholder="Invoice title"
                                    />
                                </div>
                                {errors.settings?.invoice?.quotation_title && (
                                    <div className="pw-err">
                                        {errors.settings.invoice.quotation_title}
                                    </div>
                                )}
                            </div>
                            <div className="col-md-4">
                                <label className="form-label">Delivery Note*</label>
                                <div className="input-group mb-3">
                                    <input
                                        value={formData.settings?.invoice?.delivery_note_title}
                                        type='string'
                                        onChange={(e) => {

                                            errors["settings_invoice_delivery_note"] = "";
                                            formData.settings.invoice.delivery_note_title = e.target.value;
                                            setFormData({ ...formData });
                                            console.log(formData);
                                        }}
                                        className="form-control"
                                        id="settings.invoice.delivery_note_title"
                                        placeholder="Invoice title"
                                    />
                                </div>
                                {errors.settings?.invoice?.delivery_note_title && (
                                    <div className="pw-err">
                                        {errors.settings.invoice.delivery_note_title}
                                    </div>
                                )}
                            </div>
                            <div className="col-md-4">
                                <label className="form-label">Stock Transfer*</label>
                                <div className="input-group mb-3">
                                    <input
                                        value={formData.settings?.invoice?.stock_transfer_title}
                                        type='string'
                                        onChange={(e) => {

                                            errors["settings_invoice_stock_transfer"] = "";
                                            formData.settings.invoice.stock_transfer_title = e.target.value;
                                            setFormData({ ...formData });
                                            console.log(formData);
                                        }}
                                        className="form-control"
                                        id="settings.invoice.stock_transfer_title"
                                        placeholder="Invoice title"
                                    />
                                </div>
                                {errors.settings?.invoice?.stock_transfer_title && (
                                    <div className="pw-err">
                                        {errors.settings.invoice.stock_transfer_title}
                                    </div>
                                )}
                            </div>
                            <div className="col-md-4">
                                <label className="form-label">Purchase Order*</label>
                                <div className="input-group mb-3">
                                    <input
                                        value={formData.settings?.invoice?.purchase_order_title}
                                        type='string'
                                        onChange={(e) => {
                                            errors["settings_invoice_purchase_order_title"] = "";
                                            formData.settings.invoice.purchase_order_title = e.target.value;
                                            setFormData({ ...formData });
                                        }}
                                        className="form-control"
                                        id="settings.invoice.purchase_order_title"
                                        placeholder="Purchase Order title"
                                    />
                                </div>
                                {errors.settings?.invoice?.purchase_order_title && (
                                    <div className="pw-err">
                                        {errors.settings.invoice.purchase_order_title}
                                    </div>
                                )}
                            </div>
                            <div className="col-md-4">
                                <label className="form-label">Payable*</label>
                                <div className="input-group mb-3">
                                    <input
                                        value={formData.settings?.invoice?.payable_title}
                                        type='string'
                                        onChange={(e) => {

                                            errors["settings_invoice_payable_title"] = "";
                                            formData.settings.invoice.payable_title = e.target.value;
                                            setFormData({ ...formData });
                                            console.log(formData);
                                        }}
                                        className="form-control"
                                        id="settings.invoice.payable_title"
                                        placeholder="Invoice title"
                                    />
                                </div>
                                {errors.settings?.invoice?.payable_title && (
                                    <div className="pw-err">
                                        {errors.settings.invoice.payable_title}
                                    </div>
                                )}
                            </div>
                            <div className="col-md-4">
                                <label className="form-label">Receivable*</label>
                                <div className="input-group mb-3">
                                    <input
                                        value={formData.settings?.invoice?.receivable_title}
                                        type='string'
                                        onChange={(e) => {
                                            errors["settings_invoice_receivable_title"] = "";
                                            formData.settings.invoice.receivable_title = e.target.value;
                                            setFormData({ ...formData });
                                            console.log(formData);
                                        }}
                                        className="form-control"
                                        id="settings.invoice.receivable_title"
                                        placeholder="Invoice title"
                                    />
                                </div>
                                {errors.settings?.invoice?.receivable_title && (
                                    <div className="pw-err">
                                        {errors.settings.invoice.receivable_title}
                                    </div>
                                )}
                            </div>
                        </div>


                        <h6><b>Qtn. Sales</b></h6>
                        <div className="row">
                            <div className="col-md-4">
                                <label className="form-label">Paid*</label>
                                <div className="input-group mb-">
                                    <input
                                        value={formData.settings?.invoice?.quotation_sales_titles?.paid}
                                        type='string'
                                        onChange={(e) => {

                                            errors["settings_invoice_quotation_sales_titles"] = "";
                                            formData.settings.invoice.quotation_sales_titles.paid = e.target.value;
                                            setFormData({ ...formData });
                                            console.log(formData);
                                        }}
                                        className="form-control"
                                        id="settings.invoice.quotation_sales_titles.paid"
                                        placeholder="Invoice title"
                                    />
                                </div>
                                {errors.settings?.invoice?.quotation_sales_titles?.paid && (
                                    <div className="pw-err">
                                        {errors.settings.invoice.quotation_sales_titles.paid}
                                    </div>
                                )}
                            </div>
                            <div className="col-md-4">
                                <label className="form-label">Credit*</label>
                                <div className="input-group mb-3">
                                    <input
                                        value={formData.settings?.invoice?.quotation_sales_titles?.credit}
                                        type='string'
                                        onChange={(e) => {

                                            errors["settings_invoice_quotation_sales_titles"] = "";
                                            formData.settings.invoice.quotation_sales_titles.credit = e.target.value;
                                            setFormData({ ...formData });
                                            console.log(formData);
                                        }}
                                        className="form-control"
                                        id="settings.invoice.quotation_sales_titles.credit"
                                        placeholder="Invoice title"
                                    />
                                </div>
                                {errors.settings?.invoice?.quotation_sales_titles?.credit && (
                                    <div className="pw-err">
                                        {errors.settings.invoice.quotation_sales_titles.credit}
                                    </div>
                                )}
                            </div>
                            <div className="col-md-4">
                                <label className="form-label">Cash*</label>
                                <div className="input-group mb-3">
                                    <input
                                        value={formData.settings?.invoice?.quotation_sales_titles?.cash}
                                        type='string'
                                        onChange={(e) => {

                                            errors["settings_invoice_quotation_sales_titles_cash"] = "";
                                            formData.settings.invoice.quotation_sales_titles.cash = e.target.value;
                                            setFormData({ ...formData });
                                            console.log(formData);
                                        }}
                                        className="form-control"
                                        id="settings.invoice.quotation_sales_titles.cash"
                                        placeholder="Invoice title"
                                    />
                                </div>
                                {errors.settings?.invoice?.quotation_sales_titles?.cash && (
                                    <div className="pw-err">
                                        {errors.settings.invoice.quotation_sales_titles.cash}
                                    </div>
                                )}
                            </div>
                        </div>

                        <h6><b>Qtn. Sales Return</b></h6>
                        <div className="row">
                            <div className="col-md-4">
                                <label className="form-label">Paid*</label>
                                <div className="input-group mb-">
                                    <input
                                        value={formData.settings?.invoice?.quotation_sales_return_titles?.paid}
                                        type='string'
                                        onChange={(e) => {

                                            errors["settings_invoice_quotation_sales_return_titles"] = "";
                                            formData.settings.invoice.quotation_sales_return_titles.paid = e.target.value;
                                            setFormData({ ...formData });
                                            console.log(formData);
                                        }}
                                        className="form-control"
                                        id="settings.invoice.quotation_sales_return_titles.paid"
                                        placeholder="Invoice title"
                                    />
                                </div>
                                {errors.settings?.invoice?.quotation_sales_return_titles?.paid && (
                                    <div className="pw-err">
                                        {errors.settings.invoice.quotation_sales_return_titles.paid}
                                    </div>
                                )}
                            </div>
                            <div className="col-md-4">
                                <label className="form-label">Credit*</label>
                                <div className="input-group mb-3">
                                    <input
                                        value={formData.settings?.invoice?.quotation_sales_return_titles?.credit}
                                        type='string'
                                        onChange={(e) => {

                                            errors["settings_invoice_quotation_sales_return_titles"] = "";
                                            formData.settings.invoice.quotation_sales_return_titles.credit = e.target.value;
                                            setFormData({ ...formData });
                                            console.log(formData);
                                        }}
                                        className="form-control"
                                        id="settings.invoice.quotation_sales_return_titles.credit"
                                        placeholder="Invoice title"
                                    />
                                </div>
                                {errors.settings?.invoice?.quotation_sales_return_titles?.credit && (
                                    <div className="pw-err">
                                        {errors.settings.invoice.quotation_sales_return_titles.credit}
                                    </div>
                                )}
                            </div>
                            <div className="col-md-4">
                                <label className="form-label">Cash*</label>
                                <div className="input-group mb-3">
                                    <input
                                        value={formData.settings?.invoice?.quotation_sales_return_titles?.cash}
                                        type='string'
                                        onChange={(e) => {
                                            errors["settings_invoice_quotation_sales_return_titles_cash"] = "";
                                            formData.settings.invoice.quotation_sales_return_titles.cash = e.target.value;
                                            setFormData({ ...formData });
                                            console.log(formData);
                                        }}
                                        className="form-control"
                                        id="settings.invoice.quotation_sales_return_titles.cash"
                                        placeholder="Invoice title"
                                    />
                                </div>
                                {errors.settings?.invoice?.quotation_sales_return_titles?.cash && (
                                    <div className="pw-err">
                                        {errors.settings.invoice.quotation_sales_return_titles.cash}
                                    </div>
                                )}
                            </div>
                        </div>


                        </div></div>)}
                        {activeTab === 'serial_numbers' && (<div className="pw-tab-wrap"><div className="pw-card">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}><i className="bi bi-hash" style={{ fontSize: '18px', color: '#004ac6' }}></i><h3 style={{ fontFamily: '"Hanken Grotesk", sans-serif', fontSize: '16px', fontWeight: 600, color: '#191c1e', margin: 0 }}>Serial Numbers</h3></div>
                        <div className="row g-3">
                        <h6><b>Stock Transfer ID's:</b> {formData.stock_transfer_serial_number?.prefix.toUpperCase()}-{String(formData.stock_transfer_serial_number?.start_from_count).padStart(formData.stock_transfer_serial_number?.padding_count, '0')}, {formData.stock_transfer_serial_number?.prefix.toUpperCase()}-{String((formData.stock_transfer_serial_number?.start_from_count + 1)).padStart(formData.stock_transfer_serial_number?.padding_count, '0')}...</h6>
                        <div className="col-md-2">
                            <label className="form-label">Prefix*</label>
                            <div className="input-group mb-3">
                                <input
                                    value={formData.stock_transfer_serial_number?.prefix}
                                    type='string'
                                    onChange={(e) => {

                                        errors["formData.stock_transfer_serial_number.prefix"] = "";
                                        formData.stock_transfer_serial_number.prefix = e.target.value;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="formData.stock_transfer_serial_number.prefix"
                                    placeholder="S-INV-UMLJ"
                                />


                            </div>
                            {errors.stock_transfer_serial_number_prefix && (
                                <div className="pw-err">

                                    {errors.stock_transfer_serial_number_prefix}
                                </div>
                            )}
                        </div>

                        <div className="col-md-2">
                            <label className="form-label">Padding count*</label>
                            <div className="input-group mb-3">
                                <input
                                    value={formData.stock_transfer_serial_number?.padding_count}
                                    type='number'
                                    onChange={(e) => {

                                        errors["formData.stock_transfer_serial_number.padding_count"] = "";
                                        formData.stock_transfer_serial_number.padding_count = parseInt(e.target.value);
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="formData.stock_transfer_serial_number.padding_count"
                                    placeholder="4 will make counter value: 0001"
                                />


                            </div>
                            {errors.formData?.stock_transfer_serial_number?.padding_count && (
                                <div className="pw-err">

                                    {errors.stock_transfer_serial_number_padding_count}
                                </div>
                            )}
                        </div>

                        <div className="col-md-2">
                            <label className="form-label">Counting start from*</label>
                            <div className="input-group mb-3">
                                <input
                                    value={formData.stock_transfer_serial_number?.start_from_count ? formData.stock_transfer_serial_number.start_from_count : ""}
                                    type='number'
                                    onChange={(e) => {
                                        errors["formData.stock_transfer_serial_number.start_from_count"] = "";
                                        formData.stock_transfer_serial_number.start_from_count = parseInt(e.target.value);
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="formData.stock_transfer_serial_number.start_from_count"
                                    placeholder="eg: Start counting from 1000"
                                />
                            </div>
                            {errors.stock_transfer_serial_number_start_from_count && (
                                <div className="pw-err">

                                    {errors.stock_transfer_serial_number_start_from_count}
                                </div>
                            )}
                        </div>

                        <h6><b>Sales ID's:</b> {formData.sales_serial_number.prefix.toUpperCase()}-{String(formData.sales_serial_number.start_from_count).padStart(formData.sales_serial_number.padding_count, '0')}, {formData.sales_serial_number.prefix.toUpperCase()}-{String((formData.sales_serial_number.start_from_count + 1)).padStart(formData.sales_serial_number.padding_count, '0')}...</h6>
                        <div className="col-md-2">
                            <label className="form-label">Prefix*</label>
                            <div className="input-group mb-3">
                                <input
                                    value={formData.sales_serial_number.prefix}
                                    type='string'
                                    onChange={(e) => {

                                        errors["formData.sales_serial_number.prefix"] = "";
                                        formData.sales_serial_number.prefix = e.target.value;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="formData.sales_serial_number.prefix"
                                    placeholder="S-INV-UMLJ"
                                />


                            </div>
                            {errors.sales_serial_number_prefix && (
                                <div className="pw-err">

                                    {errors.sales_serial_number_prefix}
                                </div>
                            )}
                        </div>

                        <div className="col-md-2">
                            <label className="form-label">Padding count*</label>
                            <div className="input-group mb-3">
                                <input
                                    value={formData.sales_serial_number.padding_count}
                                    type='number'
                                    onChange={(e) => {

                                        errors["formData.sales_serial_number.padding_count"] = "";
                                        formData.sales_serial_number.padding_count = parseInt(e.target.value);
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="formData.sales_serial_number.padding_count"
                                    placeholder="4 will make counter value: 0001"
                                />


                            </div>
                            {errors.formData?.sales_serial_number.padding_count && (
                                <div className="pw-err">

                                    {errors.sales_serial_number_padding_count}
                                </div>
                            )}
                        </div>

                        <div className="col-md-2">
                            <label className="form-label">Counting start from*</label>
                            <div className="input-group mb-3">
                                <input
                                    value={formData.sales_serial_number?.start_from_count ? formData.sales_serial_number.start_from_count : ""}
                                    type='number'
                                    onChange={(e) => {

                                        errors["formData.sales_serial_number.start_from_count"] = "";
                                        formData.sales_serial_number.start_from_count = parseInt(e.target.value);
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="formData.sales_serial_number.start_from_count"
                                    placeholder="eg: Start counting from 1000"
                                />


                            </div>
                            {errors.sales_serial_number_start_from_count && (
                                <div className="pw-err">

                                    {errors.sales_serial_number_start_from_count}
                                </div>
                            )}
                        </div>

                        <h5><b>Sales Return ID's:</b> {formData.sales_return_serial_number.prefix.toUpperCase()}-{String(formData.sales_return_serial_number.start_from_count).padStart(formData.sales_return_serial_number.padding_count, '0')}, {formData.sales_return_serial_number.prefix.toUpperCase()}-{String((formData.sales_return_serial_number.start_from_count + 1)).padStart(formData.sales_return_serial_number.padding_count, '0')}...</h5>
                        <div className="col-md-2">
                            <label className="form-label">Prefix*</label>
                            <div className="input-group mb-3">
                                <input
                                    value={formData.sales_return_serial_number.prefix}
                                    type='string'
                                    onChange={(e) => {

                                        errors["formData.sales_serial_number.prefix"] = "";
                                        formData.sales_return_serial_number.prefix = e.target.value;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="formData.sales_return_serial_number.prefix"
                                    placeholder="S-INV-UMLJ"
                                />


                            </div>
                            {errors.sales_return_serial_number_prefix && (
                                <div className="pw-err">

                                    {errors.sales_return_serial_number_prefix}
                                </div>
                            )}
                        </div>

                        <div className="col-md-2">
                            <label className="form-label">Padding count*</label>
                            <div className="input-group mb-3">
                                <input
                                    value={formData.sales_return_serial_number.padding_count}
                                    type='number'
                                    onChange={(e) => {

                                        errors["formData.sales_serial_number.padding_count"] = "";
                                        formData.sales_return_serial_number.padding_count = parseInt(e.target.value);
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="formData.sales_return_serial_number.padding_count"
                                    placeholder="4 will make counter value: 0001"
                                />


                            </div>
                            {errors.sales_return_serial_number_padding_count && (
                                <div className="pw-err">
                                    {errors.sales_return_serial_number_padding_count}
                                </div>
                            )}
                        </div>

                        <div className="col-md-2">
                            <label className="form-label">Counting start from*</label>
                            <div className="input-group mb-3">
                                <input
                                    value={formData.sales_return_serial_number.start_from_count}
                                    type='number'
                                    onChange={(e) => {
                                        if (!e.target.value) {
                                            formData.sales_return_serial_number.start_from_count = e.target.value;
                                            setFormData({ ...formData });
                                            return
                                        }
                                        errors["formData.sales_serial_number.start_from_count"] = "";
                                        formData.sales_return_serial_number.start_from_count = parseInt(e.target.value);
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="formData.sales_serial_number.start_from_count"
                                    placeholder="eg: Start counting from 1000"
                                />
                            </div>
                            {errors.sales_return_serial_number_start_from_count && (
                                <div className="pw-err">
                                    {errors.sales_return_serial_number_start_from_count}
                                </div>
                            )}
                        </div>


                        <h5><b>Purchase ID's:</b> {formData.purchase_serial_number.prefix.toUpperCase()}-{String(formData.purchase_serial_number.start_from_count).padStart(formData.purchase_serial_number.padding_count, '0')}, {formData.purchase_serial_number.prefix.toUpperCase()}-{String((formData.purchase_serial_number.start_from_count + 1)).padStart(formData.purchase_serial_number.padding_count, '0')}...</h5>
                        <div className="col-md-2">
                            <label className="form-label">Prefix*</label>
                            <div className="input-group mb-3">
                                <input
                                    value={formData.purchase_serial_number.prefix}
                                    type='string'
                                    onChange={(e) => {

                                        errors["formData.purchase_serial_number.prefix"] = "";
                                        formData.purchase_serial_number.prefix = e.target.value;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="formData.purchase_serial_number.prefix"
                                    placeholder="S-INV-UMLJ"
                                />

                            </div>

                            {errors.purchase_serial_number_prefix && (
                                <div className="pw-err">
                                    {errors.purchase_serial_number_prefix}
                                </div>
                            )}
                        </div>

                        <div className="col-md-2">
                            <label className="form-label">Padding count*</label>
                            <div className="input-group mb-3">
                                <input
                                    value={formData.purchase_serial_number.padding_count}
                                    type='number'
                                    onChange={(e) => {

                                        errors["formData.purchase_serial_number.padding_count"] = "";
                                        formData.purchase_serial_number.padding_count = parseInt(e.target.value);
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="formData.purchase_serial_number.padding_count"
                                    placeholder="4 will make counter value: 0001"
                                />
                            </div>
                            {errors.purchase_serial_number_padding_count && (
                                <div className="pw-err">
                                    {errors.purchase_serial_number_padding_count}
                                </div>
                            )}
                        </div>

                        <div className="col-md-2">
                            <label className="form-label">Counting start from*</label>
                            <div className="input-group mb-3">
                                <input
                                    value={formData.purchase_serial_number.start_from_count}
                                    type='number'
                                    onChange={(e) => {
                                        if (!e.target.value) {
                                            formData.purchase_serial_number.start_from_count = e.target.value;
                                            setFormData({ ...formData });
                                            return
                                        }
                                        errors["formData.purchase_serial_number.start_from_count"] = "";
                                        formData.purchase_serial_number.start_from_count = parseInt(e.target.value);
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="formData.purchase_serial_number.start_from_count"
                                    placeholder="eg: Start counting from 1000"
                                />

                            </div>
                            {errors.purchase_serial_number_start_from_count && (
                                <div className="pw-err">
                                    <i className="bi bi-x-lg"> </i>
                                    {errors.purchase_serial_number_start_from_count}
                                </div>
                            )}
                        </div>


                        <h5><b>Purchase Return ID's:</b> {formData.purchase_return_serial_number.prefix.toUpperCase()}-{String(formData.purchase_return_serial_number.start_from_count).padStart(formData.purchase_return_serial_number.padding_count, '0')}, {formData.purchase_return_serial_number.prefix.toUpperCase()}-{String((formData.purchase_return_serial_number.start_from_count + 1)).padStart(formData.purchase_return_serial_number.padding_count, '0')}...</h5>
                        <div className="col-md-2">
                            <label className="form-label">Prefix*</label>
                            <div className="input-group mb-3">
                                <input
                                    value={formData.purchase_return_serial_number.prefix}
                                    type='string'
                                    onChange={(e) => {

                                        errors["formData.purchase_return_serial_number.prefix"] = "";
                                        formData.purchase_return_serial_number.prefix = e.target.value;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="formData.purchase_return_serial_number.prefix"
                                    placeholder="PR-INV-UMLJ"
                                />


                            </div>
                            {errors.purchase_return_serial_number_prefix && (
                                <div className="pw-err">
                                    <i className="bi bi-x-lg"> </i>
                                    {errors.purchase_return_serial_number_prefix}
                                </div>
                            )}
                        </div>

                        <div className="col-md-2">
                            <label className="form-label">Padding count*</label>
                            <div className="input-group mb-3">
                                <input
                                    value={formData.purchase_return_serial_number.padding_count}
                                    type='number'
                                    onChange={(e) => {

                                        errors["formData.purchase_return_serial_number.padding_count"] = "";
                                        formData.purchase_return_serial_number.padding_count = parseInt(e.target.value);
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="formData.purchase_return_serial_number.padding_count"
                                    placeholder="4 will make counter value: 0001"
                                />


                            </div>
                            {errors.purchase_return_serial_number_padding_count && (
                                <div className="pw-err">
                                    <i className="bi bi-x-lg"> </i>
                                    {errors.purchase_return_serial_number_padding_count}
                                </div>
                            )}
                        </div>

                        <div className="col-md-2">
                            <label className="form-label">Counting start from*</label>
                            <div className="input-group mb-3">
                                <input
                                    value={formData.purchase_return_serial_number.start_from_count}
                                    type='number'
                                    onChange={(e) => {
                                        if (!e.target.value) {
                                            formData.purchase_return_serial_number.start_from_count = e.target.value;
                                            setFormData({ ...formData });
                                            return
                                        }
                                        errors["formData.purchase_return_serial_number.start_from_count"] = "";
                                        formData.purchase_return_serial_number.start_from_count = parseInt(e.target.value);
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="formData.purchase_return_serial_number.start_from_count"
                                    placeholder="eg: Start counting from 1000"
                                />

                            </div>

                            {errors.purchase_return_serial_number_start_from_count && (
                                <div className="pw-err">
                                    <i className="bi bi-x-lg"> </i>
                                    {errors.purchase_return_serial_number_start_from_count}
                                </div>
                            )}
                        </div>


                        <h5><b>Purchase Order ID's:</b> {formData.purchase_order_serial_number?.prefix?.toUpperCase()}-{String(formData.purchase_order_serial_number?.start_from_count).padStart(formData.purchase_order_serial_number?.padding_count, '0')}, {formData.purchase_order_serial_number?.prefix?.toUpperCase()}-{String((formData.purchase_order_serial_number?.start_from_count + 1)).padStart(formData.purchase_order_serial_number?.padding_count, '0')}...</h5>
                        <div className="col-md-2">
                            <label className="form-label">Prefix*</label>
                            <div className="input-group mb-3">
                                <input
                                    value={formData.purchase_order_serial_number?.prefix}
                                    type='string'
                                    onChange={(e) => {
                                        errors["purchase_order_serial_number.prefix"] = "";
                                        formData.purchase_order_serial_number.prefix = e.target.value;
                                        setFormData({ ...formData });
                                    }}
                                    className="form-control"
                                    id="formData.purchase_order_serial_number.prefix"
                                    placeholder="PO"
                                />
                            </div>
                            {errors.purchase_order_serial_number_prefix && (
                                <div className="pw-err">
                                    <i className="bi bi-x-lg"> </i>
                                    {errors.purchase_order_serial_number_prefix}
                                </div>
                            )}
                        </div>

                        <div className="col-md-2">
                            <label className="form-label">Padding count*</label>
                            <div className="input-group mb-3">
                                <input
                                    value={formData.purchase_order_serial_number?.padding_count}
                                    type='number'
                                    onChange={(e) => {
                                        errors["purchase_order_serial_number.padding_count"] = "";
                                        formData.purchase_order_serial_number.padding_count = parseInt(e.target.value);
                                        setFormData({ ...formData });
                                    }}
                                    className="form-control"
                                    id="formData.purchase_order_serial_number.padding_count"
                                    placeholder="4 will make counter value: 0001"
                                />
                            </div>
                            {errors.purchase_order_serial_number_padding_count && (
                                <div className="pw-err">
                                    <i className="bi bi-x-lg"> </i>
                                    {errors.purchase_order_serial_number_padding_count}
                                </div>
                            )}
                        </div>

                        <div className="col-md-2">
                            <label className="form-label">Counting start from*</label>
                            <div className="input-group mb-3">
                                <input
                                    value={formData.purchase_order_serial_number?.start_from_count}
                                    type='number'
                                    onChange={(e) => {
                                        if (!e.target.value) {
                                            formData.purchase_order_serial_number.start_from_count = e.target.value;
                                            setFormData({ ...formData });
                                            return;
                                        }
                                        errors["purchase_order_serial_number.start_from_count"] = "";
                                        formData.purchase_order_serial_number.start_from_count = parseInt(e.target.value);
                                        setFormData({ ...formData });
                                    }}
                                    className="form-control"
                                    id="formData.purchase_order_serial_number.start_from_count"
                                    placeholder="eg: Start counting from 1000"
                                />
                            </div>
                            {errors.purchase_order_serial_number_start_from_count && (
                                <div className="pw-err">
                                    <i className="bi bi-x-lg"> </i>
                                    {errors.purchase_order_serial_number_start_from_count}
                                </div>
                            )}
                        </div>


                        <h5><b>Quotation ID's:</b> {formData.quotation_serial_number.prefix.toUpperCase()}-{String(formData.quotation_serial_number.start_from_count).padStart(formData.quotation_serial_number.padding_count, '0')}, {formData.quotation_serial_number.prefix.toUpperCase()}-{String((formData.quotation_serial_number.start_from_count + 1)).padStart(formData.quotation_serial_number.padding_count, '0')}...</h5>
                        <div className="col-md-2">
                            <label className="form-label">Prefix*</label>
                            <div className="input-group mb-3">
                                <input
                                    value={formData.quotation_serial_number.prefix}
                                    type='string'
                                    onChange={(e) => {

                                        errors["formData.quotation_serial_number.prefix"] = "";
                                        formData.quotation_serial_number.prefix = e.target.value;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="formData.quotation_serial_number.prefix"
                                    placeholder="QTN"
                                />


                            </div>
                            {errors.quotation_serial_number_prefix && (
                                <div className="pw-err">
                                    <i className="bi bi-x-lg"> </i>
                                    {errors.quotation_serial_number_prefix}
                                </div>
                            )}
                        </div>

                        <div className="col-md-2">
                            <label className="form-label">Padding count*</label>
                            <div className="input-group mb-3">
                                <input
                                    value={formData.quotation_serial_number.padding_count}
                                    type='number'
                                    onChange={(e) => {

                                        errors["formData.quotation_serial_number.padding_count"] = "";
                                        formData.quotation_serial_number.padding_count = parseInt(e.target.value);
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="formData.quotation_serial_number.padding_count"
                                    placeholder="4 will make counter value: 0001"
                                />
                            </div>
                            {errors.quotation_serial_number_padding_count && (
                                <div className="pw-err">
                                    <i className="bi bi-x-lg"> </i>
                                    {errors.quotation_serial_number_padding_count}
                                </div>
                            )}
                        </div>

                        <div className="col-md-2">
                            <label className="form-label">Counting start from*</label>
                            <div className="input-group mb-3">
                                <input
                                    value={formData.quotation_serial_number.start_from_count}

                                    type='number'
                                    onChange={(e) => {
                                        if (!e.target.value) {
                                            formData.quotation_serial_number.start_from_count = e.target.value;
                                            setFormData({ ...formData });
                                            return
                                        }
                                        errors["formData.quotation_serial_number.start_from_count"] = "";
                                        formData.quotation_serial_number.start_from_count = parseInt(e.target.value);
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="formData.quotation_serial_number.start_from_count"
                                    placeholder="eg: Start counting from 1000"
                                />
                            </div>
                            {errors.quotation_serial_number_start_from_count && (
                                <div className="pw-err">
                                    <i className="bi bi-x-lg"> </i>
                                    {errors.quotation_serial_number_start_from_count}
                                </div>
                            )}
                        </div>

                        <h5><b>Quotation Sales Return ID's:</b> {formData.quotation_sales_return_serial_number.prefix.toUpperCase()}-{String(formData.quotation_sales_return_serial_number.start_from_count).padStart(formData.quotation_sales_return_serial_number.padding_count, '0')}, {formData.quotation_sales_return_serial_number.prefix.toUpperCase()}-{String((formData.quotation_sales_return_serial_number.start_from_count + 1)).padStart(formData.quotation_sales_return_serial_number.padding_count, '0')}...</h5>
                        <div className="col-md-2">
                            <label className="form-label">Prefix*</label>
                            <div className="input-group mb-3">
                                <input
                                    value={formData.quotation_sales_return_serial_number.prefix}
                                    type='string'
                                    onChange={(e) => {

                                        errors["formData.quotation_sales_serial_number.prefix"] = "";
                                        formData.quotation_sales_return_serial_number.prefix = e.target.value;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="formData.quotation_sales_return_serial_number.prefix"
                                    placeholder="QTN-SR"
                                />


                            </div>
                            {errors.quotation_sales_return_serial_number_prefix && (
                                <div className="pw-err">

                                    {errors.quotation_sales_return_serial_number_prefix}
                                </div>
                            )}
                        </div>

                        <div className="col-md-2">
                            <label className="form-label">Padding count*</label>
                            <div className="input-group mb-3">
                                <input
                                    value={formData.quotation_sales_return_serial_number.padding_count}
                                    type='number'
                                    onChange={(e) => {

                                        errors["formData.quotation_sales_serial_number.padding_count"] = "";
                                        formData.quotation_sales_return_serial_number.padding_count = parseInt(e.target.value);
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="formData.quotation_sales_return_serial_number.padding_count"
                                    placeholder="4 will make counter value: 0001"
                                />


                            </div>
                            {errors.quotation_sales_return_serial_number_padding_count && (
                                <div className="pw-err">
                                    {errors.quotation_sales_return_serial_number_padding_count}
                                </div>
                            )}
                        </div>

                        <div className="col-md-2">
                            <label className="form-label">Counting start from*</label>
                            <div className="input-group mb-3">
                                <input
                                    value={formData.quotation_sales_return_serial_number.start_from_count}
                                    type='number'
                                    onChange={(e) => {
                                        if (!e.target.value) {
                                            formData.quotation_sales_return_serial_number.start_from_count = e.target.value;
                                            setFormData({ ...formData });
                                            return
                                        }
                                        errors["formData.quotation_sales_serial_number.start_from_count"] = "";
                                        formData.quotation_sales_return_serial_number.start_from_count = parseInt(e.target.value);
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="formData.quotation_sales_serial_number.start_from_count"
                                    placeholder="eg: Start counting from 1000"
                                />
                            </div>
                            {errors.quotation_sales_return_serial_number_start_from_count && (
                                <div className="pw-err">
                                    {errors.quotation_sales_return_serial_number_start_from_count}
                                </div>
                            )}
                        </div>


                        <h5><b>Customer ID's:</b> {formData.customer_serial_number.prefix.toUpperCase()}-{String(formData.customer_serial_number.start_from_count).padStart(formData.customer_serial_number.padding_count, '0')}, {formData.customer_serial_number.prefix.toUpperCase()}-{String((formData.customer_serial_number.start_from_count + 1)).padStart(formData.customer_serial_number.padding_count, '0')}...</h5>
                        <div className="col-md-2">
                            <label className="form-label">Prefix</label>
                            <div className="input-group mb-3">
                                <input
                                    value={formData.customer_serial_number.prefix}
                                    type='string'
                                    onChange={(e) => {

                                        errors["formData.customer_serial_number.prefix"] = "";
                                        formData.customer_serial_number.prefix = e.target.value;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="formData.customer_serial_number.prefix"
                                    placeholder="CUST-UMLJ"
                                />


                            </div>
                            {errors.customer_serial_number_prefix && (
                                <div className="pw-err">
                                    <i className="bi bi-x-lg"> </i>
                                    {errors.customer_serial_number_prefix}
                                </div>
                            )}
                        </div>

                        <div className="col-md-2">
                            <label className="form-label">Padding count</label>
                            <div className="input-group mb-3">
                                <input
                                    value={formData.customer_serial_number.padding_count}
                                    type='number'
                                    onChange={(e) => {

                                        errors["formData.customer_serial_number.padding_count"] = "";
                                        formData.customer_serial_number.padding_count = parseInt(e.target.value);
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="formData.customer_serial_number.padding_count"
                                    placeholder="4 will make counter value: 0001"
                                />
                            </div>
                            {errors.customer_serial_number_padding_count && (
                                <div className="pw-err">
                                    <i className="bi bi-x-lg"> </i>
                                    {errors.customer_serial_number_padding_count}
                                </div>
                            )}
                        </div>

                        <div className="col-md-2">
                            <label className="form-label">Counting start from</label>
                            <div className="input-group mb-3">
                                <input
                                    value={formData.customer_serial_number.start_from_count}

                                    type='number'
                                    onChange={(e) => {
                                        if (!e.target.value) {
                                            formData.customer_serial_number.start_from_count = e.target.value;
                                            setFormData({ ...formData });
                                            return
                                        }
                                        errors["formData.customer_serial_number.start_from_count"] = "";
                                        formData.customer_serial_number.start_from_count = parseInt(e.target.value);
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="formData.customer_serial_number.start_from_count"
                                    placeholder="eg: Start counting from 1000"
                                />
                            </div>
                            {errors.customer_serial_number_start_from_count && (
                                <div className="pw-err">
                                    <i className="bi bi-x-lg"> </i>
                                    {errors.customer_serial_number_start_from_count}
                                </div>
                            )}
                        </div>

                        <h5><b>Vendor ID's:</b> {formData.vendor_serial_number.prefix.toUpperCase()}-{String(formData.vendor_serial_number.start_from_count).padStart(formData.vendor_serial_number.padding_count, '0')}, {formData.vendor_serial_number.prefix.toUpperCase()}-{String((formData.vendor_serial_number.start_from_count + 1)).padStart(formData.vendor_serial_number.padding_count, '0')}...</h5>
                        <div className="col-md-2">
                            <label className="form-label">Prefix</label>
                            <div className="input-group mb-3">
                                <input
                                    value={formData.vendor_serial_number.prefix}
                                    type='string'
                                    onChange={(e) => {
                                        errors["formData.vendor_serial_number.prefix"] = "";
                                        formData.vendor_serial_number.prefix = e.target.value;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="formData.vendor_serial_number.prefix"
                                    placeholder="VND-UMLJ"
                                />


                            </div>
                            {errors.vendor_serial_number_prefix && (
                                <div className="pw-err">
                                    <i className="bi bi-x-lg"> </i>
                                    {errors.vendor_serial_number_prefix}
                                </div>
                            )}
                        </div>

                        <div className="col-md-2">
                            <label className="form-label">Padding count</label>
                            <div className="input-group mb-3">
                                <input
                                    value={formData.vendor_serial_number.padding_count}
                                    type='number'
                                    onChange={(e) => {

                                        errors["formData.vendor_serial_number.padding_count"] = "";
                                        formData.vendor_serial_number.padding_count = parseInt(e.target.value);
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="formData.vendor_serial_number.padding_count"
                                    placeholder="4 will make counter value: 0001"
                                />
                            </div>
                            {errors.vendor_serial_number_padding_count && (
                                <div className="pw-err">
                                    <i className="bi bi-x-lg"> </i>
                                    {errors.vendor_serial_number_padding_count}
                                </div>
                            )}
                        </div>

                        <div className="col-md-2">
                            <label className="form-label">Counting start from</label>
                            <div className="input-group mb-3">
                                <input
                                    value={formData.vendor_serial_number.start_from_count}

                                    type='number'
                                    onChange={(e) => {
                                        if (!e.target.value) {
                                            formData.vendor_serial_number.start_from_count = e.target.value;
                                            setFormData({ ...formData });
                                            return
                                        }
                                        errors["vendor_serial_number_start_from_count"] = "";
                                        formData.vendor_serial_number.start_from_count = parseInt(e.target.value);
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="formData.vendor_serial_number.start_from_count"
                                    placeholder="eg: Start counting from 1000"
                                />
                            </div>
                            {errors.vendor_serial_number_start_from_count && (
                                <div className="pw-err">
                                    <i className="bi bi-x-lg"> </i>
                                    {errors.vendor_serial_number_start_from_count}
                                </div>
                            )}
                        </div>

                        <h5><b>Expense ID's:</b> {formData.expense_serial_number?.prefix.toUpperCase()}-{String(formData.expense_serial_number?.start_from_count).padStart(formData.expense_serial_number.padding_count, '0')}, {formData.expense_serial_number?.prefix.toUpperCase()}-{String((formData.expense_serial_number?.start_from_count + 1)).padStart(formData.expense_serial_number?.padding_count, '0')}...</h5>
                        <div className="col-md-2">
                            <label className="form-label">Prefix</label>
                            <div className="input-group mb-3">
                                <input
                                    value={formData.expense_serial_number.prefix}
                                    type='string'
                                    onChange={(e) => {
                                        errors["expense_serial_number_prefix"] = "";
                                        formData.expense_serial_number.prefix = e.target.value;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="formData.expense_serial_number.prefix"
                                    placeholder="EXP-UMLJ"
                                />


                            </div>
                            {errors.expense_serial_number_prefix && (
                                <div className="pw-err">
                                    <i className="bi bi-x-lg"> </i>
                                    {errors.expense_serial_number_prefix}
                                </div>
                            )}
                        </div>

                        <div className="col-md-2">
                            <label className="form-label">Padding count</label>
                            <div className="input-group mb-3">
                                <input
                                    value={formData.expense_serial_number.padding_count}
                                    type='number'
                                    onChange={(e) => {

                                        errors["expense_serial_number.padding_count"] = "";
                                        formData.expense_serial_number.padding_count = parseInt(e.target.value);
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="formData.expense_serial_number.padding_count"
                                    placeholder="4 will make counter value: 0001"
                                />
                            </div>
                            {errors.expense_serial_number_padding_count && (
                                <div className="pw-err">
                                    <i className="bi bi-x-lg"> </i>
                                    {errors.expense_serial_number_padding_count}
                                </div>
                            )}
                        </div>

                        <div className="col-md-2">
                            <label className="form-label">Counting start from</label>
                            <div className="input-group mb-3">
                                <input
                                    value={formData.expense_serial_number.start_from_count}

                                    type='number'
                                    onChange={(e) => {
                                        if (!e.target.value) {
                                            formData.expense_serial_number.start_from_count = e.target.value;
                                            setFormData({ ...formData });
                                            return
                                        }
                                        errors["expense_serial_number.start_from_count"] = "";
                                        formData.expense_serial_number.start_from_count = parseInt(e.target.value);
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="formData.expense_serial_number.start_from_count"
                                    placeholder="eg: Start counting from 1000"
                                />
                            </div>
                            {errors.expense_serial_number_start_from_count && (
                                <div className="pw-err">
                                    <i className="bi bi-x-lg"> </i>
                                    {errors.expense_serial_number_start_from_count}
                                </div>
                            )}
                        </div>

                        <h5><b>Delivery Note ID's:</b> {formData.delivery_note_serial_number?.prefix.toUpperCase()}-{String(formData.delivery_note_serial_number?.start_from_count).padStart(formData.delivery_note_serial_number.padding_count, '0')}, {formData.delivery_note_serial_number?.prefix.toUpperCase()}-{String((formData.delivery_note_serial_number?.start_from_count + 1)).padStart(formData.delivery_note_serial_number?.padding_count, '0')}...</h5>
                        <div className="col-md-2">
                            <label className="form-label">Prefix</label>
                            <div className="input-group mb-3">
                                <input
                                    value={formData.delivery_note_serial_number.prefix}
                                    type='string'
                                    onChange={(e) => {
                                        errors["delivery_note_serial_number.prefix"] = "";
                                        formData.delivery_note_serial_number.prefix = e.target.value;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="formData.delivery_note_serial_number.prefix"
                                    placeholder="DEL-NOTE"
                                />


                            </div>
                            {errors.delivery_note_serial_number_prefix && (
                                <div className="pw-err">
                                    <i className="bi bi-x-lg"> </i>
                                    {errors.delivery_note_serial_number_prefix}
                                </div>
                            )}
                        </div>

                        <div className="col-md-2">
                            <label className="form-label">Padding count</label>
                            <div className="input-group mb-3">
                                <input
                                    value={formData.delivery_note_serial_number.padding_count}
                                    type='number'
                                    onChange={(e) => {

                                        errors["delivery_note_serial_number.padding_count"] = "";
                                        formData.delivery_note_serial_number.padding_count = parseInt(e.target.value);
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="formData.delivery_note_serial_number.padding_count"
                                    placeholder="4 will make counter value: 0001"
                                />
                            </div>
                            {errors.delivery_note_serial_number_padding_count && (
                                <div className="pw-err">
                                    <i className="bi bi-x-lg"> </i>
                                    {errors.delivery_note_serial_number_padding_count}
                                </div>
                            )}
                        </div>

                        <div className="col-md-2">
                            <label className="form-label">Counting start from</label>
                            <div className="input-group mb-3">
                                <input
                                    value={formData.delivery_note_serial_number.start_from_count}
                                    type='number'
                                    onChange={(e) => {
                                        if (!e.target.value) {
                                            formData.delivery_note_serial_number.start_from_count = e.target.value;
                                            setFormData({ ...formData });
                                            return
                                        }
                                        errors["delivery_note_serial_number.start_from_count"] = "";
                                        formData.delivery_note_serial_number.start_from_count = parseInt(e.target.value);
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="formData.delivery_note_serial_number.start_from_count"
                                    placeholder="eg: Start counting from 1000"
                                />
                            </div>
                            {errors.delivery_note_serial_number_start_from_count && (
                                <div className="pw-err">
                                    <i className="bi bi-x-lg"> </i>
                                    {errors.delivery_note_serial_number_start_from_count}
                                </div>
                            )}
                        </div>
                        <h5><b>Customer Receivable ID's:</b> {formData.customer_deposit_serial_number?.prefix.toUpperCase()}-{String(formData.customer_deposit_serial_number?.start_from_count).padStart(formData.customer_deposit_serial_number.padding_count, '0')}, {formData.customer_deposit_serial_number?.prefix.toUpperCase()}-{String((formData.ustomer_deposit_serial_number?.start_from_count + 1)).padStart(formData.ustomer_deposit_serial_number?.padding_count, '0')}...</h5>
                        <div className="col-md-2">
                            <label className="form-label">Prefix</label>
                            <div className="input-group mb-3">
                                <input
                                    value={formData.customer_deposit_serial_number.prefix}
                                    type='string'
                                    onChange={(e) => {
                                        errors["customer_deposit_serial_number.prefix"] = "";
                                        formData.customer_deposit_serial_number.prefix = e.target.value;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="formData.customer_deposit_serial_number.prefix"
                                    placeholder="CUST-RCVBLE"
                                />


                            </div>
                            {errors.customer_deposit_serial_number_prefix && (
                                <div className="pw-err">
                                    <i className="bi bi-x-lg"> </i>
                                    {errors.customer_deposit_serial_number_prefix}
                                </div>
                            )}
                        </div>

                        <div className="col-md-2">
                            <label className="form-label">Padding count</label>
                            <div className="input-group mb-3">
                                <input
                                    value={formData.customer_deposit_serial_number.padding_count}
                                    type='number'
                                    onChange={(e) => {

                                        errors["customer_deposit_serial_number.padding_count"] = "";
                                        formData.customer_deposit_serial_number.padding_count = parseInt(e.target.value);
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="customer_deposit_serial_number.padding_count"
                                    placeholder="4 will make counter value: 0001"
                                />
                            </div>
                            {errors.customer_deposit_serial_number_padding_count && (
                                <div className="pw-err">
                                    <i className="bi bi-x-lg"> </i>
                                    {errors.customer_deposit_serial_number_padding_count}
                                </div>
                            )}
                        </div>

                        <div className="col-md-2">
                            <label className="form-label">Counting start from</label>
                            <div className="input-group mb-3">
                                <input
                                    value={formData.customer_deposit_serial_number.start_from_count}

                                    type='number'
                                    onChange={(e) => {
                                        if (!e.target.value) {
                                            formData.customer_deposit_serial_number.start_from_count = e.target.value;
                                            setFormData({ ...formData });
                                            return
                                        }
                                        errors["customer_deposit_serial_number.start_from_count"] = "";
                                        formData.customer_deposit_serial_number.start_from_count = parseInt(e.target.value);
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="customer_deposit_serial_number.start_from_count"
                                    placeholder="eg: Start counting from 1000"
                                />
                            </div>
                            {errors.customer_deposit_serial_number_start_from_count && (
                                <div className="pw-err">
                                    <i className="bi bi-x-lg"> </i>
                                    {errors.customer_deposit_serial_number_start_from_count}
                                </div>
                            )}
                        </div>

                        <h5><b>Customer Payable ID's:</b> {formData.customer_withdrawal_serial_number?.prefix.toUpperCase()}-{String(formData.customer_withdrawal_serial_number?.start_from_count).padStart(formData.customer_withdrawal_serial_number.padding_count, '0')}, {formData.customer_withdrawal_serial_number?.prefix.toUpperCase()}-{String((formData.customer_withdrawal_serial_number?.start_from_count + 1)).padStart(formData.customer_withdrawal_serial_number?.padding_count, '0')}...</h5>
                        <div className="col-md-2">
                            <label className="form-label">Prefix</label>
                            <div className="input-group mb-3">
                                <input
                                    value={formData.customer_withdrawal_serial_number.prefix}
                                    type='string'
                                    onChange={(e) => {
                                        errors["customer_withdrawal_serial_number.prefix"] = "";
                                        formData.customer_withdrawal_serial_number.prefix = e.target.value;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="formData.customer_withdrawal_serial_number.prefix"
                                    placeholder="CUST-PYBLE"
                                />


                            </div>
                            {errors.customer_withdrawal_serial_number_prefix && (
                                <div className="pw-err">
                                    <i className="bi bi-x-lg"> </i>
                                    {errors.customer_withdrawal_serial_number_prefix}
                                </div>
                            )}
                        </div>

                        <div className="col-md-2">
                            <label className="form-label">Padding count</label>
                            <div className="input-group mb-3">
                                <input
                                    value={formData.customer_withdrawal_serial_number.padding_count}
                                    type='number'
                                    onChange={(e) => {

                                        errors["customer_withdrawal_serial_number.padding_count"] = "";
                                        formData.customer_withdrawal_serial_number.padding_count = parseInt(e.target.value);
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="customer_withdrawal_serial_number.padding_count"
                                    placeholder="4 will make counter value: 0001"
                                />
                            </div>
                            {errors.customer_withdrawal_serial_number_padding_count && (
                                <div className="pw-err">
                                    <i className="bi bi-x-lg"> </i>
                                    {errors.customer_withdrawal_serial_number_padding_count}
                                </div>
                            )}
                        </div>

                        <div className="col-md-2">
                            <label className="form-label">Counting start from</label>
                            <div className="input-group mb-3">
                                <input
                                    value={formData.customer_withdrawal_serial_number.start_from_count}

                                    type='number'
                                    onChange={(e) => {
                                        if (!e.target.value) {
                                            formData.customer_withdrawal_serial_number.start_from_count = e.target.value;
                                            setFormData({ ...formData });
                                            return
                                        }
                                        errors["customer_deposit_serial_number.start_from_count"] = "";
                                        formData.customer_withdrawal_serial_number.start_from_count = parseInt(e.target.value);
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="customer_withdrawal_serial_number.start_from_count"
                                    placeholder="eg: Start counting from 1000"
                                />
                            </div>
                            {errors.customer_withdrawal_serial_number_start_from_count && (
                                <div className="pw-err">
                                    <i className="bi bi-x-lg"> </i>
                                    {errors.customer_withdrawal_serial_number_start_from_count}
                                </div>
                            )}
                        </div>

                        <h5><b>Capital ID's:</b> {formData.capital_deposit_serial_number?.prefix.toUpperCase()}-{String(formData.capital_deposit_serial_number?.start_from_count).padStart(formData.capital_deposit_serial_number.padding_count, '0')}, {formData.capital_deposit_serial_number?.prefix.toUpperCase()}-{String((formData.capital_deposit_serial_number?.start_from_count + 1)).padStart(formData.capital_deposit_serial_number?.padding_count, '0')}...</h5>
                        <div className="col-md-2">
                            <label className="form-label">Prefix</label>
                            <div className="input-group mb-3">
                                <input
                                    value={formData.capital_deposit_serial_number.prefix}
                                    type='string'
                                    onChange={(e) => {
                                        errors["capital_deposit_serial_number.prefix"] = "";
                                        formData.capital_deposit_serial_number.prefix = e.target.value;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="formData.capital_deposit_serial_number.prefix"
                                    placeholder="CAP-DEPO"
                                />


                            </div>
                            {errors.capital_deposit_serial_number_prefix && (
                                <div className="pw-err">
                                    <i className="bi bi-x-lg"> </i>
                                    {errors.capital_deposit_serial_number_prefix}
                                </div>
                            )}
                        </div>

                        <div className="col-md-2">
                            <label className="form-label">Padding count</label>
                            <div className="input-group mb-3">
                                <input
                                    value={formData.capital_deposit_serial_number.padding_count}
                                    type='number'
                                    onChange={(e) => {

                                        errors["capital_deposit_serial_number_padding_count"] = "";
                                        formData.capital_deposit_serial_number.padding_count = parseInt(e.target.value);
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="capital_deposit_serial_number_padding_count"
                                    placeholder="4 will make counter value: 0001"
                                />
                            </div>
                            {errors.capital_deposit_serial_number_padding_count && (
                                <div className="pw-err">
                                    <i className="bi bi-x-lg"> </i>
                                    {errors.capital_deposit_serial_number_padding_count}
                                </div>
                            )}
                        </div>

                        <div className="col-md-2">
                            <label className="form-label">Counting start from</label>
                            <div className="input-group mb-3">
                                <input
                                    value={formData.capital_deposit_serial_number.start_from_count}

                                    type='number'
                                    onChange={(e) => {
                                        if (!e.target.value) {
                                            formData.capital_deposit_serial_number.start_from_count = e.target.value;
                                            setFormData({ ...formData });
                                            return
                                        }
                                        errors["capital_deposit_serial_number.start_from_count"] = "";
                                        formData.capital_deposit_serial_number.start_from_count = parseInt(e.target.value);
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="capital_deposit_serial_number_start_from_count"
                                    placeholder="eg: Start counting from 1000"
                                />
                            </div>
                            {errors.capital_deposit_serial_number_start_from_count && (
                                <div className="pw-err">
                                    <i className="bi bi-x-lg"> </i>
                                    {errors.capital_deposit_serial_number_start_from_count}
                                </div>
                            )}
                        </div>

                        <h5><b>Drawing ID's:</b> {formData.divident_serial_number?.prefix.toUpperCase()}-{String(formData.divident_serial_number?.start_from_count).padStart(formData.divident_serial_number.padding_count, '0')}, {formData.divident_serial_number?.prefix.toUpperCase()}-{String((formData.divident_serial_number?.start_from_count + 1)).padStart(formData.divident_serial_number?.padding_count, '0')}...</h5>
                        <div className="col-md-2">
                            <label className="form-label">Prefix</label>
                            <div className="input-group mb-3">
                                <input
                                    value={formData.divident_serial_number.prefix}
                                    type='string'
                                    onChange={(e) => {
                                        errors["divident_serial_number.prefix"] = "";
                                        formData.divident_serial_number.prefix = e.target.value;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="divident_serial_number.prefix"
                                    placeholder="CAP-DRWNG"
                                />


                            </div>
                            {errors.divident_serial_number_prefix && (
                                <div className="pw-err">
                                    <i className="bi bi-x-lg"> </i>
                                    {errors.divident_serial_number_prefix}
                                </div>
                            )}
                        </div>

                        <div className="col-md-2">
                            <label className="form-label">Padding count</label>
                            <div className="input-group mb-3">
                                <input
                                    value={formData.divident_serial_number.padding_count}
                                    type='number'
                                    onChange={(e) => {

                                        errors["divident_serial_number_padding_count"] = "";
                                        formData.divident_serial_number.padding_count = parseInt(e.target.value);
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="divident_serial_number_padding_count"
                                    placeholder="4 will make counter value: 0001"
                                />
                            </div>
                            {errors.divident_serial_number_padding_count && (
                                <div className="pw-err">
                                    <i className="bi bi-x-lg"> </i>
                                    {errors.divident_serial_number_padding_count}
                                </div>
                            )}
                        </div>

                        <div className="col-md-2">
                            <label className="form-label">Counting start from</label>
                            <div className="input-group mb-3">
                                <input
                                    value={formData.divident_serial_number.start_from_count}

                                    type='number'
                                    onChange={(e) => {
                                        if (!e.target.value) {
                                            formData.divident_serial_number.start_from_count = e.target.value;
                                            setFormData({ ...formData });
                                            return
                                        }
                                        errors["divident_serial_number.start_from_count"] = "";
                                        formData.divident_serial_number.start_from_count = parseInt(e.target.value);
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="divident_serial_number_start_from_count"
                                    placeholder="eg: Start counting from 1000"
                                />
                            </div>
                            {errors.divident_serial_number_start_from_count && (
                                <div className="pw-err">
                                    <i className="bi bi-x-lg"> </i>
                                    {errors.divident_serial_number_start_from_count}
                                </div>
                            )}
                        </div>

                        </div></div></div>)}
                        {activeTab === 'bank_account' && (<div className="pw-tab-wrap"><div className="pw-card">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}><i className="bi bi-bank" style={{ fontSize: '18px', color: '#004ac6' }}></i><h3 style={{ fontFamily: '"Hanken Grotesk", sans-serif', fontSize: '16px', fontWeight: 600, color: '#191c1e', margin: 0 }}>Bank Account</h3></div>
                        <div className="row g-3">
                        <div className="col-md-4">
                            <label className="form-label">Bank Name</label>

                            <div className="input-group mb-3">
                                <input
                                    value={formData.bank_account.bank_name ? formData.bank_account.bank_name : ""}
                                    type='string'
                                    onChange={(e) => {

                                        errors["bank_account_bank_name"] = "";
                                        formData.bank_account.bank_name = e.target.value;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="bank_account_bank_name"
                                    placeholder="Bank Name"
                                />



                            </div>
                            {errors.bank_account_bank_name && (
                                <div className="pw-err">
                                    {errors.bank_account_bank_name}
                                </div>
                            )}
                        </div>

                        <div className="col-md-4">
                            <label className="form-label">Customer No.</label>

                            <div className="input-group mb-3">
                                <input
                                    value={formData.bank_account.customer_no ? formData.bank_account.customer_no : ""}
                                    type='string'
                                    onChange={(e) => {

                                        errors["bank_account_customer_no"] = "";
                                        formData.bank_account.customer_no = e.target.value;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="bank_account_customer_no"
                                    placeholder="Customer No"
                                />
                            </div>
                            {errors.bank_account_customer_no && (
                                <div className="pw-err">
                                    {errors.bank_account_customer_no}
                                </div>
                            )}
                        </div>

                        <div className="col-md-4">
                            <label className="form-label">IBAN</label>

                            <div className="input-group mb-3">
                                <input
                                    value={formData.bank_account.iban ? formData.bank_account.iban : ""}
                                    type='string'
                                    onChange={(e) => {

                                        errors["bank_account_iban"] = "";
                                        formData.bank_account.iban = e.target.value;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="bank_account_iban"
                                    placeholder="IBAN"
                                />
                            </div>
                            {errors.bank_account_iban && (
                                <div className="pw-err">
                                    {errors.bank_account_iban}
                                </div>
                            )}
                        </div>

                        <div className="col-md-4">
                            <label className="form-label">Account Name</label>

                            <div className="input-group mb-3">
                                <input
                                    value={formData.bank_account.account_name ? formData.bank_account.account_name : ""}
                                    type='string'
                                    onChange={(e) => {

                                        errors["bank_account_account_name"] = "";
                                        formData.bank_account.account_name = e.target.value;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="bank_account_account_name"
                                    placeholder="Account Name"
                                />
                            </div>
                            {errors.bank_account_account_name && (
                                <div className="pw-err">
                                    {errors.bank_account_account_name}
                                </div>
                            )}
                        </div>

                        <div className="col-md-4">
                            <label className="form-label">Account No.</label>

                            <div className="input-group mb-3">
                                <input
                                    value={formData.bank_account.account_no ? formData.bank_account.account_no : ""}
                                    type='string'
                                    onChange={(e) => {

                                        errors["bank_account_account_no"] = "";
                                        formData.bank_account.account_no = e.target.value;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="bank_account_account_no"
                                    placeholder="Account No."
                                />
                            </div>
                            {errors.bank_account_account_no && (
                                <div className="pw-err">
                                    {errors.bank_account_account_no}
                                </div>
                            )}
                        </div>

                        </div></div></div>)}
                        {activeTab === 'settings' && (<div className="pw-tab-wrap">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}><i className="bi bi-gear" style={{ fontSize: '18px', color: '#004ac6' }}></i><h3 style={{ fontFamily: '"Hanken Grotesk", sans-serif', fontSize: '16px', fontWeight: 600, color: '#191c1e', margin: 0 }}>Settings</h3></div>

                        {/* ── Invoice & Display ── */}
                        <div className="pw-card" style={{ marginBottom: '16px' }}>
                            <div className="pw-group-title"><i className="bi bi-receipt" style={{ color: '#004ac6' }}></i> Invoice &amp; Display</div>
                            <div className="pw-check-grid">
                                <label className="pw-check" htmlFor="show_currency_symbol">
                                    <input type="checkbox" id="show_currency_symbol" checked={!!formData.settings.show_currency_symbol} value={formData.settings.show_currency_symbol} onChange={() => { errors["show_currency_symbol"] = ""; formData.settings.show_currency_symbol = !formData.settings.show_currency_symbol; setFormData({ ...formData }); }} />
                                    <span>Show Currency Symbol</span>
                                </label>
                                <label className="pw-check" htmlFor="show_seller_info_in_invoice">
                                    <input type="checkbox" id="show_seller_info_in_invoice" checked={!!formData.settings.show_seller_info_in_invoice} value={formData.settings.show_seller_info_in_invoice} onChange={() => { errors["show_seller_info_in_invoice"] = ""; formData.settings.show_seller_info_in_invoice = !formData.settings.show_seller_info_in_invoice; setFormData({ ...formData }); }} />
                                    <span>Show Seller Info in Invoice</span>
                                </label>
                                <label className="pw-check" htmlFor="show_address_in_invoice_footer">
                                    <input type="checkbox" id="show_address_in_invoice_footer" checked={!!formData.settings.show_address_in_invoice_footer} value={formData.settings.show_address_in_invoice_footer} onChange={() => { errors["formData.show_address_in_invoice_footer"] = ""; formData.settings.show_address_in_invoice_footer = !formData.settings.show_address_in_invoice_footer; setFormData({ ...formData }); }} />
                                    <span>Show Address in Invoice Footer</span>
                                </label>
                                <label className="pw-check" htmlFor="show_received_by_footer_in_invoice">
                                    <input type="checkbox" id="show_received_by_footer_in_invoice" name="show_received_by_footer_in_invoice" checked={!!formData.settings.show_received_by_footer_in_invoice} value={formData.settings.show_received_by_footer_in_invoice} onChange={() => { errors["show_received_by_footer_in_invoice"] = ""; formData.settings.show_received_by_footer_in_invoice = !formData.settings.show_received_by_footer_in_invoice; setFormData({ ...formData }); }} />
                                    <span>Show Received By Footer in Invoices</span>
                                </label>
                                <label className="pw-check" htmlFor="zatca_qr_on_left_bottom">
                                    <input type="checkbox" id="zatca_qr_on_left_bottom" checked={!!formData.settings.zatca_qr_on_left_bottom} value={formData.settings.zatca_qr_on_left_bottom} onChange={() => { errors["formData.zatca_qr_on_left_bottom"] = ""; formData.settings.zatca_qr_on_left_bottom = !formData.settings.zatca_qr_on_left_bottom; setFormData({ ...formData }); }} />
                                    <span>ZATCA QR on Left Bottom</span>
                                </label>
                                <label className="pw-check" htmlFor="enable_invoice_print_type_selection">
                                    <input type="checkbox" id="enable_invoice_print_type_selection" checked={!!formData.settings.enable_invoice_print_type_selection} value={formData.settings.enable_invoice_print_type_selection} onChange={() => { errors["enable_invoice_print_type_selection"] = ""; formData.settings.enable_invoice_print_type_selection = !formData.settings.enable_invoice_print_type_selection; setFormData({ ...formData }); }} />
                                    <span>Enable Invoice Print Type Selection</span>
                                </label>
                                <label className="pw-check" htmlFor="one_line_product_name_in_invoice">
                                    <input type="checkbox" id="one_line_product_name_in_invoice" checked={!!formData.settings.one_line_product_name_in_invoice} value={formData.settings.one_line_product_name_in_invoice} onChange={() => { errors["one_line_product_name_in_invoice"] = ""; formData.settings.one_line_product_name_in_invoice = !formData.settings.one_line_product_name_in_invoice; setFormData({ ...formData }); }} />
                                    <span>One Line Product Name in Invoice</span>
                                </label>
                                <label className="pw-check" htmlFor="one_line_product_name_in_print_invoice">
                                    <input type="checkbox" id="one_line_product_name_in_print_invoice" checked={!!formData.settings.one_line_product_name_in_print_invoice} value={formData.settings.one_line_product_name_in_print_invoice} onChange={() => { errors["one_line_product_name_in_print_invoice"] = ""; formData.settings.one_line_product_name_in_print_invoice = !formData.settings.one_line_product_name_in_print_invoice; setFormData({ ...formData }); }} />
                                    <span>One Line Product Name in Print Invoice</span>
                                </label>
                                <label className="pw-check" htmlFor="add_price_details_in_delivery_note">
                                    <input type="checkbox" id="add_price_details_in_delivery_note" checked={!!formData.settings.add_price_details_in_delivery_note} value={formData.settings.add_price_details_in_delivery_note} onChange={() => { errors["add_price_details_in_delivery_note"] = ""; formData.settings.add_price_details_in_delivery_note = !formData.settings.add_price_details_in_delivery_note; setFormData({ ...formData }); }} />
                                    <span>Add Price Details in Delivery Note</span>
                                </label>
                            </div>
                        </div>

                        {/* ── Sales & Purchasing ── */}
                        <div className="pw-card" style={{ marginBottom: '16px' }}>
                            <div className="pw-group-title"><i className="bi bi-cart3" style={{ color: '#004ac6' }}></i> Sales &amp; Purchasing</div>
                            <div className="pw-check-grid" style={{ marginBottom: '16px' }}>
                                <label className="pw-check" htmlFor="skip_product_selection_while_delivery_note_import">
                                    <input type="checkbox" id="skip_product_selection_while_delivery_note_import" checked={!!formData.settings.skip_product_selection_while_delivery_note_import} value={formData.settings.skip_product_selection_while_delivery_note_import} onChange={() => { errors["skip_product_selection_while_delivery_note_import"] = ""; formData.settings.skip_product_selection_while_delivery_note_import = !formData.settings.skip_product_selection_while_delivery_note_import; setFormData({ ...formData }); }} />
                                    <span>Skip Product Selection on Delivery Note Import</span>
                                </label>
                                <label className="pw-check" htmlFor="disable_purchases_on_accounts">
                                    <input type="checkbox" id="disable_purchases_on_accounts" checked={!!formData.settings.disable_purchases_on_accounts} value={formData.settings.disable_purchases_on_accounts} onChange={() => { errors["disable_purchases_on_accounts"] = ""; formData.settings.disable_purchases_on_accounts = !formData.settings.disable_purchases_on_accounts; setFormData({ ...formData }); }} />
                                    <span>Disable Purchases on Accounts</span>
                                </label>
                                <label className="pw-check" htmlFor="block_sale_when_purchase_price_is_higher">
                                    <input type="checkbox" id="block_sale_when_purchase_price_is_higher" checked={!!formData.settings.block_sale_when_purchase_price_is_higher} value={formData.settings.block_sale_when_purchase_price_is_higher} onChange={() => { errors["block_sale_when_purchase_price_is_higher"] = ""; formData.settings.block_sale_when_purchase_price_is_higher = !formData.settings.block_sale_when_purchase_price_is_higher; setFormData({ ...formData }); }} />
                                    <span>Block Sale When Purchase Price is Lower</span>
                                </label>
                                <label className="pw-check" htmlFor="enable_auto_sales_payment_close_on_purchase">
                                    <input type="checkbox" id="enable_auto_sales_payment_close_on_purchase" checked={!!formData.settings.enable_auto_sales_payment_close_on_purchase} value={formData.settings.enable_auto_sales_payment_close_on_purchase} onChange={() => { errors["enable_auto_sales_payment_close_on_purchase"] = ""; formData.settings.enable_auto_sales_payment_close_on_purchase = !formData.settings.enable_auto_sales_payment_close_on_purchase; setFormData({ ...formData }); }} />
                                    <span>Auto-close Sales Payment on Purchase</span>
                                </label>
                                <label className="pw-check" htmlFor="enable_auto_purchase_payment_close_on_sales">
                                    <input type="checkbox" id="enable_auto_purchase_payment_close_on_sales" checked={!!formData.settings.enable_auto_purchase_payment_close_on_sales} value={formData.settings.enable_auto_purchase_payment_close_on_sales} onChange={() => { errors["enable_auto_purchase_payment_close_on_sales"] = ""; formData.settings.enable_auto_purchase_payment_close_on_sales = !formData.settings.enable_auto_purchase_payment_close_on_sales; setFormData({ ...formData }); }} />
                                    <span>Auto-close Purchase Payment on Sales</span>
                                </label>
                                <label className="pw-check" htmlFor="enable_auto_payment_close_on_return">
                                    <input type="checkbox" id="enable_auto_payment_close_on_return" checked={!!formData.settings.enable_auto_payment_close_on_return} value={formData.settings.enable_auto_payment_close_on_return} onChange={() => { errors["enable_auto_payment_close_on_return"] = ""; formData.settings.enable_auto_payment_close_on_return = !formData.settings.enable_auto_payment_close_on_return; setFormData({ ...formData }); }} />
                                    <span>Auto-close Payment on Return</span>
                                </label>
                                <label className="pw-check" htmlFor="allow_adjust_same_date_payments">
                                    <input type="checkbox" id="allow_adjust_same_date_payments" checked={!!formData.settings.allow_adjust_same_date_payments} value={formData.settings.allow_adjust_same_date_payments} onChange={() => { errors["allow_adjust_same_date_payments"] = ""; formData.settings.allow_adjust_same_date_payments = !formData.settings.allow_adjust_same_date_payments; setFormData({ ...formData }); }} />
                                    <span>Allow Adjusting Same-Date Payments</span>
                                </label>
                            </div>
                            <div style={{ maxWidth: '280px' }}>
                                <div className="pw-field">
                                    <label htmlFor="block_sales_after_pending_count">Block Sales After N Pending <span style={{ color: '#6b7280', fontWeight: 400 }}>(0 = disabled)</span></label>
                                    <input type="number" min="0" id="block_sales_after_pending_count" placeholder="0" value={formData.settings.block_sales_after_pending_count || ""}
                                        onChange={(e) => { const raw = e.target.value; formData.settings.block_sales_after_pending_count = raw === "" ? 0 : (parseInt(raw) || 0); setFormData({ ...formData }); }} />
                                </div>
                            </div>
                        </div>

                        {/* ── Modules & Features ── */}
                        <div className="pw-card" style={{ marginBottom: '16px' }}>
                            <div className="pw-group-title"><i className="bi bi-grid-3x3-gap" style={{ color: '#004ac6' }}></i> Modules &amp; Features</div>
                            <div className="pw-check-grid">
                                <label className="pw-check" htmlFor="enable_warehouse_module">
                                    <input type="checkbox" id="enable_warehouse_module" checked={!!formData.settings.enable_warehouse_module} value={formData.settings.enable_warehouse_module} onChange={() => { errors["enable_warehouse_module"] = ""; formData.settings.enable_warehouse_module = !formData.settings.enable_warehouse_module; setFormData({ ...formData }); }} />
                                    <span>Enable Warehouse Module</span>
                                </label>
                                <label className="pw-check" htmlFor="enable_purchase_order_module">
                                    <input type="checkbox" id="enable_purchase_order_module" checked={!!formData.settings.enable_purchase_order_module} value={formData.settings.enable_purchase_order_module} onChange={() => { errors["enable_purchase_order_module"] = ""; formData.settings.enable_purchase_order_module = !formData.settings.enable_purchase_order_module; setFormData({ ...formData }); }} />
                                    <span>Enable Purchase Order Module</span>
                                </label>
                                <label className="pw-check" htmlFor="enable_sales_page_selection">
                                    <input type="checkbox" id="enable_sales_page_selection" checked={!!formData.settings.enable_sales_page_selection} value={formData.settings.enable_sales_page_selection} onChange={() => { formData.settings.enable_sales_page_selection = !formData.settings.enable_sales_page_selection; setFormData({ ...formData }); }} />
                                    <span>Enable Sales Page Selection</span>
                                </label>
                                <label className="pw-check" htmlFor="enable_notification">
                                    <input type="checkbox" id="enable_notification" checked={!!formData.settings.enable_notification} value={formData.settings.enable_notification} onChange={() => { formData.settings.enable_notification = !formData.settings.enable_notification; setFormData({ ...formData }); }} />
                                    <span>Enable Notifications</span>
                                </label>
                                <label className="pw-check" htmlFor="enable_auto_translation_to_arabic">
                                    <input type="checkbox" id="enable_auto_translation_to_arabic" checked={!!formData.settings.enable_auto_translation_to_arabic} value={formData.settings.enable_auto_translation_to_arabic} onChange={() => { errors["enable_auto_translation_to_arabic"] = ""; formData.settings.enable_auto_translation_to_arabic = !formData.settings.enable_auto_translation_to_arabic; setFormData({ ...formData }); }} />
                                    <span>Enable Auto Translation to Arabic</span>
                                </label>
                                <label className="pw-check" htmlFor="enable_arabic_names_list">
                                    <input type="checkbox" id="enable_arabic_names_list" checked={!!formData.settings.enable_arabic_names_list} value={formData.settings.enable_arabic_names_list} onChange={() => { formData.settings.enable_arabic_names_list = !formData.settings.enable_arabic_names_list; setFormData({ ...formData }); }} />
                                    <span>Enable Arabic Names List (Product Form)</span>
                                </label>
                                <label className="pw-check" htmlFor="allow_products_duplicates_by_default">
                                    <input type="checkbox" id="allow_products_duplicates_by_default" checked={!!formData.settings.allow_products_duplicates_by_default} value={formData.settings.allow_products_duplicates_by_default} onChange={() => { formData.settings.allow_products_duplicates_by_default = !formData.settings.allow_products_duplicates_by_default; setFormData({ ...formData }); }} />
                                    <span>Mark Allow Products Duplicates by Default</span>
                                </label>
                                <label className="pw-check" htmlFor="enable_products">
                                    <input type="checkbox" id="enable_products" checked={!!formData.settings.enable_products} value={formData.settings.enable_products} onChange={() => { formData.settings.enable_products = !formData.settings.enable_products; setFormData({ ...formData }); }} />
                                    <span>Enable Products</span>
                                </label>
                                <label className="pw-check" htmlFor="enable_services">
                                    <input type="checkbox" id="enable_services" checked={!!formData.settings.enable_services} value={formData.settings.enable_services} onChange={() => { formData.settings.enable_services = !formData.settings.enable_services; setFormData({ ...formData }); }} />
                                    <span>Enable Services</span>
                                </label>
                            </div>
                        </div>

                        {/* ── Accounting & Financials ── */}
                        <div className="pw-card" style={{ marginBottom: '16px' }}>
                            <div className="pw-group-title"><i className="bi bi-calculator" style={{ color: '#004ac6' }}></i> Accounting &amp; Financials</div>
                            <div className="pw-check-grid">
                                <label className="pw-check" htmlFor="show_minus_on_liability_balance_in_balance_sheet">
                                    <input type="checkbox" id="show_minus_on_liability_balance_in_balance_sheet" checked={!!formData.settings.show_minus_on_liability_balance_in_balance_sheet} value={formData.settings.show_minus_on_liability_balance_in_balance_sheet} onChange={() => { errors["show_minus_on_liability_balance_in_balance_sheet"] = ""; formData.settings.show_minus_on_liability_balance_in_balance_sheet = !formData.settings.show_minus_on_liability_balance_in_balance_sheet; setFormData({ ...formData }); }} />
                                    <span>Show Minus on Liability Balance in Balance Sheet</span>
                                </label>
                                <label className="pw-check" htmlFor="hide_total_amount_row_in_balance_sheet">
                                    <input type="checkbox" id="hide_total_amount_row_in_balance_sheet" checked={!!formData.settings.hide_total_amount_row_in_balance_sheet} value={formData.settings.hide_total_amount_row_in_balance_sheet} onChange={() => { errors["hide_total_amount_row_in_balance_sheet"] = ""; formData.settings.hide_total_amount_row_in_balance_sheet = !formData.settings.hide_total_amount_row_in_balance_sheet; setFormData({ ...formData }); }} />
                                    <span>Hide Total Amount Row in Balance Sheet</span>
                                </label>
                                <label className="pw-check" htmlFor="quotation_invoice_accounting">
                                    <input type="checkbox" id="quotation_invoice_accounting" checked={!!formData.settings.quotation_invoice_accounting} value={formData.settings.quotation_invoice_accounting} onChange={() => { errors["formData.quotation_invoice_accounting"] = ""; formData.settings.quotation_invoice_accounting = !formData.settings.quotation_invoice_accounting; setFormData({ ...formData }); }} />
                                    <span>Enable Quotation Invoice Accounting</span>
                                </label>
                            </div>
                        </div>

                        {/* ── Stats Dashboard ── */}
                        <div className="pw-card" style={{ marginBottom: '16px' }}>
                            <div className="pw-group-title"><i className="bi bi-bar-chart-line" style={{ color: '#004ac6' }}></i> Stats Dashboard</div>
                            <div className="pw-check-grid">
                                <label className="pw-check" htmlFor="stats_show_overall_summary">
                                    <input type="checkbox" id="stats_show_overall_summary" checked={!!formData.settings.stats_show_overall_summary} value={formData.settings.stats_show_overall_summary} onChange={() => { formData.settings.stats_show_overall_summary = !formData.settings.stats_show_overall_summary; setFormData({ ...formData }); }} />
                                    <span>Show Overall Summary</span>
                                </label>
                                <label className="pw-check" htmlFor="stats_show_profit_loss_statement">
                                    <input type="checkbox" id="stats_show_profit_loss_statement" checked={!!formData.settings.stats_show_profit_loss_statement} value={formData.settings.stats_show_profit_loss_statement} onChange={() => { formData.settings.stats_show_profit_loss_statement = !formData.settings.stats_show_profit_loss_statement; setFormData({ ...formData }); }} />
                                    <span>Show Profit / Loss Statement</span>
                                </label>
                            </div>
                        </div>

                        {/* ── Quotation Settings ── */}
                        <div className="pw-card" style={{ marginBottom: '16px' }}>
                            <div className="pw-group-title"><i className="bi bi-file-earmark-text" style={{ color: '#004ac6' }}></i> Quotation Settings</div>
                            <div className="pw-check-grid" style={{ marginBottom: '16px' }}>
                                <label className="pw-check" htmlFor="update_product_stock_on_quotation_sales">
                                    <input type="checkbox" id="update_product_stock_on_quotation_sales" checked={!!formData.settings.update_product_stock_on_quotation_sales} value={formData.settings.update_product_stock_on_quotation_sales} onChange={() => { errors["hide_quotation_invoice_vat"] = ""; formData.settings.update_product_stock_on_quotation_sales = !formData.settings.update_product_stock_on_quotation_sales; setFormData({ ...formData }); }} />
                                    <span>Update Product Stock on Quotation Sales</span>
                                </label>
                                <label className="pw-check" htmlFor="hide_quotation_invoice_vat">
                                    <input type="checkbox" id="hide_quotation_invoice_vat" checked={!!formData.settings.hide_quotation_invoice_vat} value={formData.settings.hide_quotation_invoice_vat} onChange={() => { errors["hide_quotation_invoice_vat"] = ""; formData.settings.hide_quotation_invoice_vat = !formData.settings.hide_quotation_invoice_vat; setFormData({ ...formData }); }} />
                                    <span>Hide Quotation Invoice VAT</span>
                                </label>
                                <label className="pw-check" htmlFor="enable_monthly_serial_number">
                                    <input type="checkbox" id="enable_monthly_serial_number" checked={!!formData.settings.enable_monthly_serial_number} value={formData.settings.enable_monthly_serial_number} onChange={() => { errors["enable_monthly_serial_number"] = ""; formData.settings.enable_monthly_serial_number = !formData.settings.enable_monthly_serial_number; setFormData({ ...formData }); }} />
                                    <span>Enable Monthly Serial Number Reset</span>
                                </label>
                            </div>
                            <div className="row g-3" style={{ maxWidth: '560px' }}>
                                <div className="col-md-6">
                                    <div className="pw-field">
                                        <label htmlFor="default_quotation_validity_days">Default Quotation Validity (days)</label>
                                        <input type="number" id="default_quotation_validity_days" placeholder="e.g. 30"
                                            value={formData.settings.default_quotation_validity_days || ""}
                                            onChange={(e) => {
                                                if (!e.target.value) { formData.settings.default_quotation_validity_days = null; errors["default_quotation_validity_days"] = ""; setFormData({ ...formData }); setErrors({ ...errors }); return; }
                                                if (parseInt(e.target.value) <= 0) { formData.settings.default_quotation_validity_days = parseInt(e.target.value); setFormData({ ...formData }); errors["default_quotation_validity_days"] = "Default quotation validity days should be > 0"; setErrors({ ...errors }); return; }
                                                errors["default_quotation_validity_days"] = ""; setErrors({ ...errors }); formData.settings.default_quotation_validity_days = parseInt(e.target.value); setFormData({ ...formData });
                                            }} />
                                        {errors.default_quotation_validity_days && <span className="pw-err"><i className="bi bi-x-circle"></i> {errors.default_quotation_validity_days}</span>}
                                    </div>
                                </div>
                                <div className="col-md-6">
                                    <div className="pw-field">
                                        <label htmlFor="default_quotation_delivery_days">Default Quotation Delivery (days)</label>
                                        <input type="number" id="default_quotation_delivery_days" placeholder="e.g. 7"
                                            value={formData.settings.default_quotation_delivery_days || ""}
                                            onChange={(e) => {
                                                if (!e.target.value) { formData.settings.default_quotation_delivery_days = null; errors["default_quotation_delivery_days"] = ""; setFormData({ ...formData }); setErrors({ ...errors }); return; }
                                                if (parseInt(e.target.value) <= 0) { formData.settings.default_quotation_delivery_days = parseInt(e.target.value); setFormData({ ...formData }); errors["default_quotation_delivery_days"] = "Default quotation delivery days should be > 0"; setErrors({ ...errors }); return; }
                                                errors["default_quotation_delivery_days"] = ""; setErrors({ ...errors }); formData.settings.default_quotation_delivery_days = parseInt(e.target.value); setFormData({ ...formData }); console.log(formData);
                                            }} />
                                        {errors.default_quotation_delivery_days && <span className="pw-err"><i className="bi bi-x-circle"></i> {errors.default_quotation_delivery_days}</span>}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ── WhatsApp Integration ── */}
                        <div className="pw-card" style={{ marginBottom: '0', border: '1px solid #c3d7b8', background: '#f6fbf4' }}>
                            <div className="pw-group-title" style={{ borderBottomColor: '#c3d7b8' }}>
                                <i className="bi bi-whatsapp" style={{ color: '#25d366', fontSize: '14px' }}></i>
                                <span style={{ color: '#1a4d2e' }}>WhatsApp Integration (Evolution API)</span>
                            </div>
                            <div style={{ marginBottom: '14px' }}>
                                <label className="pw-check" htmlFor="use_whatsapp_api" style={{ maxWidth: '420px', background: '#edf7ea', borderRadius: '6px', padding: '10px 12px' }}>
                                    <input type="checkbox" id="use_whatsapp_api" checked={!!formData.settings.use_whatsapp_api} value={formData.settings.use_whatsapp_api} onChange={() => { formData.settings.use_whatsapp_api = !formData.settings.use_whatsapp_api; setFormData({ ...formData }); }} />
                                    <span style={{ color: '#1a4d2e', fontWeight: 600 }}>Use WhatsApp API — send invoices as PDF attachments</span>
                                </label>
                                <p style={{ marginLeft: '12px', marginTop: '4px', fontSize: '12px', color: '#4b7a5c', fontFamily: '"Inter", sans-serif' }}>When enabled, invoices are sent as PDF files via your connected WhatsApp number instead of a link.</p>
                            </div>
                            <div className="row g-3">
                                <div className="col-md-4">
                                    <div className="pw-field">
                                        <label htmlFor="evolution_api_url">Evolution API URL</label>
                                        <input type="text" id="evolution_api_url" placeholder="http://localhost:8081" value={formData.settings.evolution_api_url || ""} onChange={(e) => { formData.settings.evolution_api_url = e.target.value; setFormData({ ...formData }); }} />
                                        <small>Leave blank to use default (http://localhost:8081)</small>
                                    </div>
                                </div>
                                <div className="col-md-4">
                                    <div className="pw-field">
                                        <label htmlFor="evolution_api_key">Evolution API Key</label>
                                        <input type="text" id="evolution_api_key" placeholder="startpos-evo-local-key" value={formData.settings.evolution_api_key || ""} onChange={(e) => { formData.settings.evolution_api_key = e.target.value; setFormData({ ...formData }); }} />
                                    </div>
                                </div>
                                <div className="col-md-4">
                                    <div className="pw-field">
                                        <label htmlFor="evolution_instance_name">Evolution Instance Name</label>
                                        <input type="text" id="evolution_instance_name" placeholder="startpos" value={formData.settings.evolution_instance_name || ""} onChange={(e) => { formData.settings.evolution_instance_name = e.target.value; setFormData({ ...formData }); }} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="row g-3" style={{ display: 'none' }}>{/* legacy fields removed from display */}


                        <div className="col-md-2">
                            <div className="input-group mb-3">
                                <input type="checkbox"
                                    value={formData.settings.show_currency_symbol}
                                    checked={formData.settings.show_currency_symbol}
                                    onChange={(e) => {
                                        errors["show_currency_symbol"] = "";
                                        formData.settings.show_currency_symbol = !formData.settings.show_currency_symbol;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className=""
                                    id="show_currency_symbol"

                                /> &nbsp;Show Currency Symbol
                            </div>
                            <label className="form-label"></label>
                            {errors.show_currency_symbol && (
                                <div className="pw-err">
                                    {errors.show_currency_symbol}
                                </div>
                            )}
                        </div>

                        <div className="col-md-2">
                            <div className="input-group mb-3">
                                <input type="checkbox"
                                    value={formData.settings.enable_auto_translation_to_arabic}
                                    checked={formData.settings.enable_auto_translation_to_arabic}
                                    onChange={(e) => {
                                        errors["enable_auto_translation_to_arabic"] = "";
                                        formData.settings.enable_auto_translation_to_arabic = !formData.settings.enable_auto_translation_to_arabic;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className=""
                                    id="enable_auto_translation_to_arabic"

                                /> &nbsp;Enable Auto Translation to Arabic
                            </div>
                            <label className="form-label"></label>
                            {errors.enable_auto_translation_to_arabic && (
                                <div className="pw-err">
                                    {errors.enable_auto_translation_to_arabic}
                                </div>
                            )}
                        </div>

                        <div className="col-md-2">
                            <div className="input-group mb-3">
                                <input type="checkbox"
                                    value={formData.settings.enable_warehouse_module}
                                    checked={formData.settings.enable_warehouse_module}
                                    onChange={(e) => {
                                        errors["enable_warehouse_module"] = "";
                                        formData.settings.enable_warehouse_module = !formData.settings.enable_warehouse_module;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className=""
                                    id="enable_warehouse_module"

                                /> &nbsp;Enable Warehouse Module
                            </div>
                            <label className="form-label"></label>
                            {errors.enable_warehouse_module && (
                                <div className="pw-err">
                                    {errors.enable_warehouse_module}
                                </div>
                            )}
                        </div>

                        <div className="col-md-2">
                            <div className="input-group mb-3">
                                <input type="checkbox"
                                    value={formData.settings.add_price_details_in_delivery_note}
                                    checked={formData.settings.add_price_details_in_delivery_note}
                                    onChange={(e) => {
                                        errors["add_price_details_in_delivery_note"] = "";
                                        formData.settings.add_price_details_in_delivery_note = !formData.settings.add_price_details_in_delivery_note;
                                        setFormData({ ...formData });
                                    }}
                                    className=""
                                    id="add_price_details_in_delivery_note"
                                /> &nbsp;Add price details in Delivery note
                            </div>
                            <label className="form-label"></label>
                            {errors.add_price_details_in_delivery_note && (
                                <div className="pw-err">
                                    {errors.add_price_details_in_delivery_note}
                                </div>
                            )}
                        </div>

                        <div className="col-md-2">
                            <div className="input-group mb-3">
                                <input type="checkbox"
                                    value={formData.settings.skip_product_selection_while_delivery_note_import}
                                    checked={formData.settings.skip_product_selection_while_delivery_note_import}
                                    onChange={(e) => {
                                        errors["skip_product_selection_while_delivery_note_import"] = "";
                                        formData.settings.skip_product_selection_while_delivery_note_import = !formData.settings.skip_product_selection_while_delivery_note_import;
                                        setFormData({ ...formData });
                                    }}
                                    className=""
                                    id="skip_product_selection_while_delivery_note_import"
                                /> &nbsp;Skip Product Selection While Delivery Note Import
                            </div>
                            <label className="form-label"></label>
                            {errors.skip_product_selection_while_delivery_note_import && (
                                <div className="pw-err">
                                    {errors.skip_product_selection_while_delivery_note_import}
                                </div>
                            )}
                        </div>

                        <div className="col-md-3">
                            <label className="form-label">Block Sales After N Pending (0 = disabled)</label>
                            <div className="input-group mb-3">
                                <input type="number"
                                    min="0"
                                    value={formData.settings.block_sales_after_pending_count || ""}
                                    onChange={(e) => {
                                        const raw = e.target.value;
                                        formData.settings.block_sales_after_pending_count = raw === "" ? 0 : (parseInt(raw) || 0);
                                        setFormData({ ...formData });
                                    }}
                                    className="form-control"
                                    id="block_sales_after_pending_count"
                                    placeholder="0"
                                />
                            </div>
                        </div>

                        <div className="col-md-2">
                            <div className="input-group mb-3">
                                <input type="checkbox"
                                    value={formData.settings.disable_purchases_on_accounts}
                                    checked={formData.settings.disable_purchases_on_accounts}
                                    onChange={(e) => {
                                        errors["disable_purchases_on_accounts"] = "";
                                        formData.settings.disable_purchases_on_accounts = !formData.settings.disable_purchases_on_accounts;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className=""
                                    id="disable_purchases_on_accounts"

                                /> &nbsp;Disable Purchases On Accounts
                            </div>
                            <label className="form-label"></label>
                            {errors.disable_purchases_on_accounts && (
                                <div className="pw-err">
                                    {errors.disable_purchases_on_accounts}
                                </div>
                            )}
                        </div>

                        <div className="col-md-2">
                            <div className="input-group mb-3">
                                <input type="checkbox"
                                    value={formData.settings.enable_notification}
                                    checked={!!formData.settings.enable_notification}
                                    onChange={(e) => {
                                        formData.settings.enable_notification = !formData.settings.enable_notification;
                                        setFormData({ ...formData });
                                    }}
                                    className=""
                                    id="enable_notification"
                                /> &nbsp;Enable Notification
                            </div>
                            <label className="form-label"></label>
                        </div>

                        <div className="col-md-2">
                            <div className="input-group mb-3">
                                <input type="checkbox"
                                    value={formData.settings.enable_sales_page_selection}
                                    checked={!!formData.settings.enable_sales_page_selection}
                                    onChange={(e) => {
                                        formData.settings.enable_sales_page_selection = !formData.settings.enable_sales_page_selection;
                                        setFormData({ ...formData });
                                    }}
                                    className=""
                                    id="enable_sales_page_selection"
                                /> &nbsp;Enable Sales Page Selection
                            </div>
                            <label className="form-label"></label>
                        </div>

                        <div className="col-md-12 mt-3">
                            <h6 className="text-success"><i className="bi bi-whatsapp me-1"></i>WhatsApp Integration (Evolution API)</h6>
                        </div>

                        <div className="col-md-3">
                            <div className="input-group mb-3">
                                <input type="checkbox"
                                    value={formData.settings.use_whatsapp_api}
                                    checked={!!formData.settings.use_whatsapp_api}
                                    onChange={(e) => {
                                        formData.settings.use_whatsapp_api = !formData.settings.use_whatsapp_api;
                                        setFormData({ ...formData });
                                    }}
                                    className=""
                                    id="use_whatsapp_api"
                                /> &nbsp;Use WhatsApp API (send PDF as attachment)
                            </div>
                            <label className="form-label text-muted" style={{fontSize:'0.8em'}}>When enabled, invoices are sent as PDF files via your connected WhatsApp number instead of a link.</label>
                        </div>

                        <div className="col-md-4">
                            <div className="mb-3">
                                <label className="form-label fw-bold">Evolution API URL</label>
                                <input type="text"
                                    className="form-control"
                                    placeholder="http://localhost:8081"
                                    value={formData.settings.evolution_api_url || ""}
                                    onChange={(e) => {
                                        formData.settings.evolution_api_url = e.target.value;
                                        setFormData({ ...formData });
                                    }}
                                />
                                <small className="text-muted">Leave blank to use default (http://localhost:8081)</small>
                            </div>
                        </div>

                        <div className="col-md-4">
                            <div className="mb-3">
                                <label className="form-label fw-bold">Evolution API Key</label>
                                <input type="text"
                                    className="form-control"
                                    placeholder="startpos-evo-local-key"
                                    value={formData.settings.evolution_api_key || ""}
                                    onChange={(e) => {
                                        formData.settings.evolution_api_key = e.target.value;
                                        setFormData({ ...formData });
                                    }}
                                />
                            </div>
                        </div>

                        <div className="col-md-4">
                            <div className="mb-3">
                                <label className="form-label fw-bold">Evolution Instance Name</label>
                                <input type="text"
                                    className="form-control"
                                    placeholder="startpos"
                                    value={formData.settings.evolution_instance_name || ""}
                                    onChange={(e) => {
                                        formData.settings.evolution_instance_name = e.target.value;
                                        setFormData({ ...formData });
                                    }}
                                />
                            </div>
                        </div>

                        <div className="col-md-2">
                            <div className="input-group mb-3">
                                <input type="checkbox"
                                    value={formData.settings.enable_auto_sales_payment_close_on_purchase}
                                    checked={formData.settings.enable_auto_sales_payment_close_on_purchase}
                                    onChange={(e) => {
                                        errors["enable_auto_sales_payment_close_on_purchase"] = "";
                                        formData.settings.enable_auto_sales_payment_close_on_purchase = !formData.settings.enable_auto_sales_payment_close_on_purchase;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className=""
                                    id="enable_auto_sales_payment_close_on_purchase"

                                /> &nbsp;Enable Auto Sales Payment Close On Purchase
                            </div>
                            <label className="form-label"></label>
                            {errors.enable_auto_sales_payment_close_on_purchase && (
                                <div className="pw-err">
                                    {errors.enable_auto_sales_payment_close_on_purchase}
                                </div>
                            )}
                        </div>

                        <div className="col-md-2">
                            <div className="input-group mb-3">
                                <input type="checkbox"
                                    value={formData.settings.enable_auto_purchase_payment_close_on_sales}
                                    checked={formData.settings.enable_auto_purchase_payment_close_on_sales}
                                    onChange={(e) => {
                                        errors["enable_auto_purchase_payment_close_on_sales"] = "";
                                        formData.settings.enable_auto_purchase_payment_close_on_sales = !formData.settings.enable_auto_purchase_payment_close_on_sales;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className=""
                                    id="enable_auto_purchase_payment_close_on_sales"

                                /> &nbsp;Enable Auto Purchase Payment Close On Sales
                            </div>
                            <label className="form-label"></label>
                            {errors.enable_auto_purchase_payment_close_on_sales && (
                                <div className="pw-err">
                                    {errors.enable_auto_purchase_payment_close_on_sales}
                                </div>
                            )}
                        </div>


                        <div className="col-md-2">
                            <div className="input-group mb-3">
                                <input type="checkbox"
                                    value={formData.settings.enable_auto_payment_close_on_return}
                                    checked={formData.settings.enable_auto_payment_close_on_return}
                                    onChange={(e) => {
                                        errors["enable_auto_payment_close_on_return"] = "";
                                        formData.settings.enable_auto_payment_close_on_return = !formData.settings.enable_auto_payment_close_on_return;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className=""
                                    id="enable_auto_payment_close_on_return"

                                /> &nbsp;Enable Auto Payment Close On Return
                            </div>
                            <label className="form-label"></label>
                            {errors.enable_auto_payment_close_on_return && (
                                <div className="pw-err">
                                    {errors.enable_auto_payment_close_on_return}
                                </div>
                            )}
                        </div>

                        <div className="col-md-2">
                            <div className="input-group mb-3">
                                <input type="checkbox"
                                    value={formData.settings.stats_show_overall_summary}
                                    checked={formData.settings.stats_show_overall_summary}
                                    onChange={(e) => {
                                        formData.settings.stats_show_overall_summary = !formData.settings.stats_show_overall_summary;
                                        setFormData({ ...formData });
                                    }}
                                    className=""
                                    id="stats_show_overall_summary"
                                /> &nbsp;Stats: Show Overall Summary
                            </div>
                            <label className="form-label"></label>
                        </div>

                        <div className="col-md-2">
                            <div className="input-group mb-3">
                                <input type="checkbox"
                                    value={formData.settings.stats_show_profit_loss_statement}
                                    checked={formData.settings.stats_show_profit_loss_statement}
                                    onChange={(e) => {
                                        formData.settings.stats_show_profit_loss_statement = !formData.settings.stats_show_profit_loss_statement;
                                        setFormData({ ...formData });
                                    }}
                                    className=""
                                    id="stats_show_profit_loss_statement"
                                /> &nbsp;Stats: Show Profit / Loss Statement
                            </div>
                            <label className="form-label"></label>
                        </div>


                        <div className="col-md-2">
                            <div className="input-group mb-3">
                                <input type="checkbox"
                                    value={formData.settings.update_product_stock_on_quotation_sales}
                                    checked={formData.settings.update_product_stock_on_quotation_sales}
                                    onChange={(e) => {
                                        errors["hide_quotation_invoice_vat"] = "";
                                        formData.settings.update_product_stock_on_quotation_sales = !formData.settings.update_product_stock_on_quotation_sales;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className=""
                                    id="hide_quotation_invoice_vat"

                                /> &nbsp;Update product stock on quotation sales
                            </div>
                            <label className="form-label"></label>
                            {errors.update_product_stock_on_quotation_sales && (
                                <div className="pw-err">
                                    {errors.update_product_stock_on_quotation_sales}
                                </div>
                            )}
                        </div>

                        <div className="col-md-2">
                            <div className="input-group mb-3">
                                <input type="checkbox"
                                    value={formData.settings.hide_quotation_invoice_vat}
                                    checked={formData.settings.hide_quotation_invoice_vat}
                                    onChange={(e) => {
                                        errors["hide_quotation_invoice_vat"] = "";
                                        formData.settings.hide_quotation_invoice_vat = !formData.settings.hide_quotation_invoice_vat;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className=""
                                    id="hide_quotation_invoice_vat"

                                /> &nbsp;Hide quotation invoice vat
                            </div>
                            <label className="form-label"></label>
                            {errors.hide_quotation_invoice_vat && (
                                <div className="pw-err">
                                    {errors.hide_quotation_invoice_vat}
                                </div>
                            )}
                        </div>

                        <div className="col-md-2">
                            <div className="input-group mb-3">
                                <input type="checkbox"
                                    value={formData.settings.allow_adjust_same_date_payments}
                                    checked={formData.settings.allow_adjust_same_date_payments}
                                    onChange={(e) => {
                                        errors["allow_adjust_same_date_payments"] = "";
                                        formData.settings.allow_adjust_same_date_payments = !formData.settings.allow_adjust_same_date_payments
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className=""
                                    id=" allow_adjust_same_date_payments"

                                /> &nbsp;Allow adjust same date payments
                            </div>
                            <label className="form-label"></label>
                            {errors.allow_adjust_same_date_payments && (
                                <div className="pw-err">
                                    {errors.allow_adjust_same_date_payments}
                                </div>
                            )}
                        </div>

                        <div className="col-md-2">
                            <div className="input-group mb-3">
                                <input type="checkbox"
                                    value={formData.settings.enable_invoice_print_type_selection}
                                    checked={formData.settings.enable_invoice_print_type_selection}
                                    onChange={(e) => {

                                        errors["enable_invoice_print_type_selection"] = "";
                                        formData.settings.enable_invoice_print_type_selection = !formData.settings.enable_invoice_print_type_selection
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className=""
                                    id="enable_invoice_print_type_selection"

                                /> &nbsp;Enable invoice print type selection
                            </div>
                            <label className="form-label"></label>
                            {errors.enable_invoice_print_type_selection && (
                                <div className="pw-err">
                                    {errors.enable_invoice_print_type_selection}
                                </div>
                            )}
                        </div>


                        <div className="col-md-2">
                            <div className="input-group mb-3">
                                <input type="checkbox"
                                    value={formData.settings.show_seller_info_in_invoice}
                                    checked={formData.settings.show_seller_info_in_invoice}
                                    onChange={(e) => {

                                        errors["show_seller_info_in_invoice"] = "";
                                        formData.settings.show_seller_info_in_invoice = !formData.settings.show_seller_info_in_invoice
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className=""
                                    id="show_seller_info_in_invoice"

                                /> &nbsp;Show seller info in invoice
                            </div>
                            <label className="form-label"></label>
                            {errors.show_minus_on_liability_balance_in_balance_sheet && (
                                <div className="pw-err">
                                    {errors.show_minus_on_liability_balance_in_balance_sheet}
                                </div>
                            )}
                        </div>


                        <div className="col-md-2">
                            <div className="input-group mb-3">
                                <input type="checkbox"
                                    value={formData.settings.show_minus_on_liability_balance_in_balance_sheet}
                                    checked={formData.settings.show_minus_on_liability_balance_in_balance_sheet}
                                    onChange={(e) => {

                                        errors["show_minus_on_liability_balance_in_balance_sheet"] = "";
                                        formData.settings.show_minus_on_liability_balance_in_balance_sheet = !formData.settings.show_minus_on_liability_balance_in_balance_sheet
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className=""
                                    id="show_minus_on_liability_balance_in_balance_sheet"

                                /> &nbsp;Show Minus On Liability Balance In Balance Sheet
                            </div>
                            <label className="form-label"></label>
                            {errors.show_minus_on_liability_balance_in_balance_sheet && (
                                <div className="pw-err">
                                    {errors.show_minus_on_liability_balance_in_balance_sheet}
                                </div>
                            )}
                        </div>


                        <div className="col-md-2">
                            <div className="input-group mb-3">
                                <input type="checkbox"
                                    value={formData.settings.hide_total_amount_row_in_balance_sheet}
                                    checked={formData.settings.hide_total_amount_row_in_balance_sheet}
                                    onChange={(e) => {

                                        errors["hide_total_amount_row_in_balance_sheet"] = "";
                                        formData.settings.hide_total_amount_row_in_balance_sheet = !formData.settings.hide_total_amount_row_in_balance_sheet;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className=""
                                    id="hide_total_amount_row_in_balance_sheet"

                                /> &nbsp;Hide total amount row in balance_sheet
                            </div>
                            <label className="form-label"></label>
                            {errors.hide_total_amount_row_in_balance_sheet && (
                                <div className="pw-err">
                                    {errors.hide_total_amount_row_in_balance_sheet}
                                </div>
                            )}
                        </div>


                        <div className="col-md-2">
                            <div className="input-group mb-3">
                                <input type="checkbox"
                                    value={formData.settings.show_address_in_invoice_footer}
                                    checked={formData.settings.show_address_in_invoice_footer}
                                    onChange={(e) => {

                                        errors["formData.show_address_in_invoice_footer"] = "";
                                        formData.settings.show_address_in_invoice_footer = !formData.settings.show_address_in_invoice_footer
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className=""
                                    id="formData.show_address_in_invoice_footer"

                                /> &nbsp;Show addres in invoice footer
                            </div>
                            <label className="form-label"></label>
                            {errors.show_address_in_invoice_footer && (
                                <div className="pw-err">
                                    {errors.show_address_in_invoice_footer}
                                </div>
                            )}
                        </div>
                        <div className="col-md-2">
                            <div className="input-group mb-3">
                                <input type="checkbox"
                                    value={formData.settings.show_received_by_footer_in_invoice}
                                    checked={formData.settings.show_received_by_footer_in_invoice}
                                    onChange={(e) => {

                                        errors["show_received_by_footer_in_invoice"] = "";
                                        formData.settings.show_received_by_footer_in_invoice = !formData.settings.show_received_by_footer_in_invoice
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className=""
                                    id="show_received_by_footer_in_invoice"
                                    name="show_received_by_footer_in_invoice"

                                /> &nbsp;Show received by footer in invoices
                            </div>
                            <label className="form-label"></label>
                            {errors.show_received_by_footer_in_invoice && (
                                <div className="pw-err">
                                    {errors.show_received_by_footer_in_invoice}
                                </div>
                            )}
                        </div>



                        <div className="col-md-2">
                            <div className="input-group mb-3">
                                <input type="checkbox"
                                    value={formData.settings.zatca_qr_on_left_bottom}
                                    checked={formData.settings.zatca_qr_on_left_bottom}
                                    onChange={(e) => {

                                        errors["formData.zatca_qr_on_left_bottom"] = "";
                                        formData.settings.zatca_qr_on_left_bottom = !formData.settings.zatca_qr_on_left_bottom
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className=""
                                    id="formData.zatca_qr_on_left_bottom"
                                /> &nbsp;Zatca QR on left bottom
                            </div>
                            <label className="form-label"></label>
                            {errors.zatca_qr_on_left_bottom && (
                                <div className="pw-err">
                                    {errors.zatca_qr_on_left_bottom}
                                </div>
                            )}
                        </div>

                        <div className="col-md-2">
                            <div className="input-group mb-3">
                                <input type="checkbox"
                                    value={formData.settings.quotation_invoice_accounting}
                                    checked={formData.settings.quotation_invoice_accounting}
                                    onChange={(e) => {

                                        errors["formData.quotation_invoice_accounting"] = "";
                                        formData.settings.quotation_invoice_accounting = !formData.settings.quotation_invoice_accounting
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className=""
                                    id="formData.quotation_invoice_accounting"
                                /> &nbsp;Enable Quotation Invoice Accounting
                            </div>
                            <label className="form-label"></label>
                            {errors.quotation_invoice_accounting && (
                                <div className="pw-err">
                                    {errors.quotation_invoice_accounting}
                                </div>
                            )}
                        </div>


                        <div className="col-md-2">
                            <div className="input-group mb-3">
                                <input type="checkbox"
                                    value={formData.settings.block_sale_when_purchase_price_is_higher}
                                    checked={formData.settings.block_sale_when_purchase_price_is_higher}
                                    onChange={(e) => {
                                        errors["block_sale_when_purchase_price_is_higher"] = "";
                                        formData.settings.block_sale_when_purchase_price_is_higher = !formData.settings.block_sale_when_purchase_price_is_higher;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className=""
                                    id="block_sale_when_purchase_price_is_higher"
                                /> &nbsp;Block Sales When purchase price is lower
                            </div>
                            <label className="form-label"></label>
                            {errors.block_sale_when_purchase_price_is_higher && (
                                <div className="pw-err">
                                    {errors.block_sale_when_purchase_price_is_higher}
                                </div>
                            )}
                        </div>

                        <div className="col-md-2">
                            <div className="input-group mb-3">
                                <input type="checkbox"
                                    value={formData.settings.one_line_product_name_in_invoice}
                                    checked={formData.settings.one_line_product_name_in_invoice}
                                    onChange={(e) => {
                                        errors["one_line_product_name_in_invoice"] = "";
                                        formData.settings.one_line_product_name_in_invoice = !formData.settings.one_line_product_name_in_invoice;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className=""
                                    id="one_line_product_name_in_invoice"
                                /> &nbsp;One line product name in invoice
                            </div>
                            <label className="form-label"></label>
                            {errors.one_line_product_name_in_invoice && (
                                <div className="pw-err">
                                    {errors.one_line_product_name_in_invoice}
                                </div>
                            )}
                        </div>

                        <div className="col-md-2">
                            <div className="input-group mb-3">
                                <input type="checkbox"
                                    value={formData.settings.one_line_product_name_in_print_invoice}
                                    checked={formData.settings.one_line_product_name_in_print_invoice}
                                    onChange={(e) => {
                                        errors["one_line_product_name_in_print_invoice"] = "";
                                        formData.settings.one_line_product_name_in_print_invoice = !formData.settings.one_line_product_name_in_print_invoice;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className=""
                                    id="one_line_product_name_in_invoice"
                                /> &nbsp;One line product name in print invoice
                            </div>
                            <label className="form-label"></label>
                            {errors.one_line_product_name_in_print_invoice && (
                                <div className="pw-err">
                                    {errors.one_line_product_name_in_print_invoice}
                                </div>
                            )}
                        </div>

                        <div className="col-md-2">
                            <div className="input-group mb-3">
                                <input type="checkbox"
                                    value={formData.settings.enable_monthly_serial_number}
                                    checked={formData.settings.enable_monthly_serial_number}
                                    onChange={(e) => {
                                        errors["enable_monthly_serial_number"] = "";
                                        formData.settings.enable_monthly_serial_number = !formData.settings.enable_monthly_serial_number;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className=""
                                    id="block_sale_when_purchase_price_is_higher"
                                /> &nbsp;Enable monthly serial number
                            </div>
                            <label className="form-label"></label>
                            {errors.enable_monthly_serial_number && (
                                <div className="pw-err">
                                    {errors.enable_monthly_serial_number}
                                </div>
                            )}
                        </div>



                        <div className="col-md-3">
                            <label className="form-label">Default quotation validity (# of Days)*</label>
                            <div className="input-group mb-3">
                                <input
                                    type="number"
                                    className="text-center"
                                    style={{ width: "50px" }}
                                    value={formData.settings.default_quotation_validity_days}
                                    onChange={(e) => {
                                        console.log("Inside onchange validity days");
                                        if (!e.target.value) {
                                            formData.settings.default_quotation_validity_days = null;
                                            errors["default_quotation_validity_days"] = "";
                                            setFormData({ ...formData });
                                            setErrors({ ...errors });
                                            return;
                                        }

                                        if (parseInt(e.target.value) <= 0) {
                                            formData.settings.default_quotation_validity_days = parseInt(e.target.value);
                                            setFormData({ ...formData });
                                            errors["default_quotation_validity_days"] =
                                                "Deafult quotation validity days should be > 0";
                                            setErrors({ ...errors });
                                            return;
                                        }

                                        errors["default_quotation_validity_days"] = "";
                                        setErrors({ ...errors });
                                        formData.settings.default_quotation_validity_days = parseInt(e.target.value);
                                        setFormData({ ...formData });
                                    }}
                                />

                                {errors.default_quotation_validity_days && (
                                    <div className="pw-err">
                                        {errors.default_quotation_validity_days}
                                    </div>
                                )}
                            </div>
                        </div>

                        </div></div>)}

                        {activeTab === 'designs' && (<div className="pw-tab-wrap">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}><i className="bi bi-palette" style={{ fontSize: '18px', color: '#004ac6' }}></i><h3 style={{ fontFamily: '"Hanken Grotesk", sans-serif', fontSize: '16px', fontWeight: 600, color: '#191c1e', margin: 0 }}>Designs</h3></div>

                        <div className="pw-card" style={{ marginBottom: '16px' }}>
                            <div className="pw-group-title"><i className="bi bi-window-split" style={{ color: '#004ac6' }}></i> Form Designs</div>
                            <div className="row g-3">
                                <div className="col-md-4">
                                    <label className="form-label fw-semibold" style={{ fontFamily: '"Inter", sans-serif', fontSize: '13px' }}>Sales Create/Update Form</label>
                                    <select
                                        className="form-select"
                                        value={formData.settings?.sales_create_form_design || 'type1'}
                                        onChange={(e) => { formData.settings.sales_create_form_design = e.target.value; setFormData({ ...formData }); }}
                                    >
                                        <option value="type1">Type 1 (Default)</option>
                                        <option value="type2">Type 2</option>
                                        <option value="type3">Type 3</option>
                                        <option value="type4">VAN Store (Type 4)</option>
                                    </select>
                                    <div style={{ color: '#6c757d', fontSize: '12px', marginTop: '4px' }}>Layout style for the sales order creation and update form</div>
                                </div>
                                <div className="col-md-4">
                                    <label className="form-label fw-semibold" style={{ fontFamily: '"Inter", sans-serif', fontSize: '13px' }}>Sales Return Create/Update Form</label>
                                    <select
                                        className="form-select"
                                        value={formData.settings?.sales_return_create_form_design || 'type1'}
                                        onChange={(e) => { formData.settings.sales_return_create_form_design = e.target.value; setFormData({ ...formData }); }}
                                    >
                                        <option value="type1">Type 1 (Default)</option>
                                        <option value="type2">Type 2</option>
                                    </select>
                                    <div style={{ color: '#6c757d', fontSize: '12px', marginTop: '4px' }}>Layout style for the sales return creation and update form</div>
                                </div>
                                <div className="col-md-4">
                                    <label className="form-label fw-semibold" style={{ fontFamily: '"Inter", sans-serif', fontSize: '13px' }}>Purchase Create/Update Form</label>
                                    <select
                                        className="form-select"
                                        value={formData.settings?.purchase_create_form_design || 'type1'}
                                        onChange={(e) => { formData.settings.purchase_create_form_design = e.target.value; setFormData({ ...formData }); }}
                                    >
                                        <option value="type1">Type 1 (Default)</option>
                                        <option value="type2">Type 2</option>
                                    </select>
                                    <div style={{ color: '#6c757d', fontSize: '12px', marginTop: '4px' }}>Layout style for the purchase creation and update form</div>
                                </div>
                                <div className="col-md-4">
                                    <label className="form-label fw-semibold" style={{ fontFamily: '"Inter", sans-serif', fontSize: '13px' }}>Purchase Return Create/Update Form</label>
                                    <select
                                        className="form-select"
                                        value={formData.settings?.purchase_return_create_form_design || 'type1'}
                                        onChange={(e) => { formData.settings.purchase_return_create_form_design = e.target.value; setFormData({ ...formData }); }}
                                    >
                                        <option value="type1">Type 1 (Default)</option>
                                        <option value="type2">Type 2</option>
                                    </select>
                                    <div style={{ color: '#6c757d', fontSize: '12px', marginTop: '4px' }}>Layout style for the purchase return creation and update form</div>
                                </div>
                                <div className="col-md-4">
                                    <label className="form-label fw-semibold" style={{ fontFamily: '"Inter", sans-serif', fontSize: '13px' }}>Quotation Create/Update Form</label>
                                    <select
                                        className="form-select"
                                        value={formData.settings?.quotation_create_form_design || 'type1'}
                                        onChange={(e) => { formData.settings.quotation_create_form_design = e.target.value; setFormData({ ...formData }); }}
                                    >
                                        <option value="type1">Type 1 (Default)</option>
                                        <option value="type2">Type 2</option>
                                    </select>
                                    <div style={{ color: '#6c757d', fontSize: '12px', marginTop: '4px' }}>Layout style for the quotation creation and update form</div>
                                </div>
                                <div className="col-md-4">
                                    <label className="form-label fw-semibold" style={{ fontFamily: '"Inter", sans-serif', fontSize: '13px' }}>Quotation Sales Return Create/Update Form</label>
                                    <select
                                        className="form-select"
                                        value={formData.settings?.quotation_sales_return_create_form_design || 'type1'}
                                        onChange={(e) => { formData.settings.quotation_sales_return_create_form_design = e.target.value; setFormData({ ...formData }); }}
                                    >
                                        <option value="type1">Type 1 (Default)</option>
                                        <option value="type2">Type 2</option>
                                    </select>
                                    <div style={{ color: '#6c757d', fontSize: '12px', marginTop: '4px' }}>Layout style for the quotation sales return creation and update form</div>
                                </div>
                            </div>
                        </div>

                        </div>)}

                        {activeTab === 'zatca_credentials' && formData.zatca?.phase === "2" && (<div className="pw-tab-wrap"><div className="pw-card">
                            <h6 className="fw-semibold mb-3"><i className="bi bi-shield-lock me-2"></i>ZATCA Credentials</h6>
                            {[
                                { label: 'Environment',                    value: formData.zatca?.env },
                                { label: 'Connected',                      value: formData.zatca?.connected ? 'Yes' : 'No' },
                                { label: 'OTP',                            value: formData.zatca?.otp },
                                { label: 'CSR',                            value: formData.zatca?.csr },
                                { label: 'Private Key',                    value: formData.zatca?.private_key },
                                { label: 'Binary Security Token',          value: formData.zatca?.binary_security_token },
                                { label: 'Secret',                         value: formData.zatca?.secret },
                                { label: 'Production Binary Security Token', value: formData.zatca?.production_binary_security_token },
                                { label: 'Production Secret',              value: formData.zatca?.production_secret },
                                { label: 'Compliance Request ID',          value: formData.zatca?.compliance_request_id },
                                { label: 'Production Request ID',          value: formData.zatca?.production_request_id },
                                { label: 'Last Connected At',              value: formData.zatca?.last_connected_at },
                                { label: 'Last Disconnected At',           value: formData.zatca?.last_disconnected_at },
                                { label: 'Connection Failed Count',        value: formData.zatca?.connection_failed_count },
                                { label: 'Last Failed At',                 value: formData.zatca?.connection_last_failed_at },
                            ].map(({ label, value }) => (
                                <div className="row mb-2" key={label}>
                                    <div className="col-md-4">
                                        <label className="form-label fw-semibold mb-0" style={{ fontSize: '13px' }}>{label}</label>
                                    </div>
                                    <div className="col-md-8">
                                        {value == null || value === '' || value === 0 ? (
                                            <span className="text-muted" style={{ fontSize: '13px' }}>—</span>
                                        ) : (
                                            <span className="font-monospace d-block" style={{ fontSize: '12px', color: '#212529', wordBreak: 'break-all' }}>{String(value)}</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {formData.zatca?.connection_errors?.length > 0 && (
                                <div className="row mb-2">
                                    <div className="col-md-4">
                                        <label className="form-label fw-semibold mb-0" style={{ fontSize: '13px' }}>Connection Errors</label>
                                    </div>
                                    <div className="col-md-8">
                                        {formData.zatca.connection_errors.map((err, i) => (
                                            <div key={i} className="text-danger" style={{ fontSize: '12px' }}>{err}</div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div></div>)}

                        </div>{/* pw-content-scroll */}
                        </div>{/* pw-content */}
                    </form>
                </Modal.Body>

            </Modal>


        </>
    );
});

export default StoreCreate;
