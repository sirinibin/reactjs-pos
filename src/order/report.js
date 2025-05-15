import { React, useState, useRef, forwardRef, useImperativeHandle, useEffect, useCallback, useMemo } from "react";
import { Modal, Button, Spinner } from 'react-bootstrap';
import ReportContent from './reportContent.js';

//import { useReactToPrint } from 'react-to-print';
import html2pdf from 'html2pdf.js';
import "./print.css";
//import jsPDF from "jspdf";
//import html2canvas from "html2canvas";


const ReportPreview = forwardRef((props, ref) => {
    let [modelName, setModelName] = useState("sales_report");
    let [model, setModel] = useState({});
    const [show, setShow] = useState(props.show);

    useImperativeHandle(ref, () => ({
        async open(modelNameStr) {
            modelName = modelNameStr;
            setModelName(modelName);
            model.store_id = localStorage.getItem("store_id");
            if (model.store_id) {
                await getStore(model.store_id);
            }

            model.models = [];
            model.customer = null;
            model.vendor = null;
            model.dateStr = getDateString();

            if (props.searchParams["customer_id"]) {
                await getCustomer(props.searchParams["customer_id"]);
            }

            if (props.searchParams["vendor_id"]) {
                await getVendor(props.searchParams["vendor_id"]);
            }

            getAllModels();

            setInvoiceTitle(modelName);
            preparePages();
            setShow(true);
            console.log("model:", model);
            /*
                if (model.customer_id) {
                    await getCustomer(model.customer_id);
                }

                if (model.vendor_id) {
                    await getVendor(model.vendor_id);
                }*/

        },

    }));

    function getDateString() {
        let dateStr = "";
        if (props.searchParams) {
            if (props.searchParams["from_date"] && props.searchParams["to_date"]) {
                dateStr = props.searchParams["from_date"] + " - " + props.searchParams["to_date"] + " | " + getArabicDate(props.searchParams["from_date"]) + " - " + getArabicDate(props.searchParams["to_date"])
            } else if (props.searchParams["from_date"]) {
                dateStr = "Since " + props.searchParams["from_date"] + " | " + getArabicDate(props.searchParams["from_date"]) + " منذ"
            } else if (props.searchParams["to_date"]) {
                dateStr = "Upto " + props.searchParams["to_date"] + " | " + getArabicDate(props.searchParams["to_date"]) + " تصل "
            } else if (props.searchParams["date_str"]) {
                dateStr = props.searchParams["date_str"] + " | " + getArabicDate(props.searchParams["date_str"])
            }
        }

        return dateStr;
    }

    function getArabicDate(engishDate) {
        let event = new Date(engishDate);
        let options = {
            year: 'numeric',
            month: 'numeric',
            day: 'numeric',
            // hour: "numeric",
            //minute: "numeric",
            //second: "numeric",
            //  timeZoneName: "short",
        };
        return event.toLocaleDateString('ar-EG', options)
    }

    /*
    const [totalSales, setTotalSales] = useState(0.00);
    const [netProfit, setNetProfit] = useState(0.00);
    const [vatPrice, setVatPrice] = useState(0.00);
    const [totalPaidSales, setTotalPaidSales] = useState(0.00);
    const [totalUnPaidSales, setTotalUnPaidSales] = useState(0.00);
    const [totalCashSales, setTotalCashSales] = useState(0.00);
    const [totalBankAccountSales, setTotalBankAccountSales] = useState(0.00);
    const [loss, setLoss] = useState(0.00);
    const [returnCount, setReturnCount] = useState(0.00);
    const [returnPaidAmount, setReturnPaidAmount] = useState(0.00);
    */


    //const [isListLoading, setIsListLoading] = useState(false);
    // let [statsOpen, setStatsOpen] = useState(false);
    let [fettingAllRecordsInProgress, setFettingAllRecordsInProgress] = useState(false);

    //const timerRef = useRef(null);

    async function getAllModels() {
        // setStatsOpen(false);
        const requestOptions = {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: localStorage.getItem("access_token"),
            },
        };
        let Select = "";
        if (modelName === "sales_report") {
            Select =
                "select=id,code,date,net_total,total_payment_received,balance_amount,customer_name,payment_status";
        } else if (modelName === "sales_return_report") {
            Select =
                "select=id,code,date,net_total,total_payment_received,balance_amount,customer_name,payment_status";
        } else if (modelName === "purchase_report") {
            Select =
                "select=id,code,date,net_total,total_payment_received,balance_amount,vendor_name,payment_status";
        } else if (modelName === "purchase_return_report") {
            Select =
                "select=id,code,date,net_total,total_payment_received,balance_amount,vendor_name,payment_status";
        } else if (modelName === "quotation_report") {
            props.searchParams["type"] = "quotation"
            Select =
                "select=id,code,date,net_total,customer_name";
        } else if (modelName === "quotation_invoice_report") {
            props.searchParams["type"] = "invoice"
            Select =
                "select=id,code,date,net_total,total_payment_received,balance_amount,customer_name,payment_status";
        } else if (modelName === "delivery_note_report") {
            Select =
                "select=id,code,date,customer_id,customer_name";
        }


        if (localStorage.getItem("store_id")) {
            props.searchParams.store_id = localStorage.getItem("store_id");
        }

        const d = new Date();
        let diff = d.getTimezoneOffset();
        console.log("Timezone:", parseFloat(diff / 60));
        props.searchParams["timezone_offset"] = parseFloat(diff / 60);

        props.searchParams["stats"] = "1";


        // setSearchParams(propsearchParams);
        let queryParams = ObjectToSearchQueryParams(props.searchParams);
        if (queryParams !== "") {
            queryParams = "&" + queryParams;
        }

        let size = 1000;

        let models = [];
        var pageNo = 1;

        console.log("modelName:", modelName);
        let apiNameSpace = "";
        if (modelName === "sales_report") {
            apiNameSpace = "order"
        } else if (modelName === "sales_return_report") {
            apiNameSpace = "sales-return"
        } else if (modelName === "purchase_report") {
            apiNameSpace = "purchase"
        } else if (modelName === "purchase_return_report") {
            apiNameSpace = "purchase-return"
        } else if (modelName === "quotation_report") {
            apiNameSpace = "quotation"
        } else if (modelName === "quotation_invoice_report") {
            apiNameSpace = "quotation"
        } else if (modelName === "delivery_note_report") {
            apiNameSpace = "delivery-note"
        }

        for (; true;) {
            if (pageNo > 1 && props.searchParams["stats"] === "1") {
                props.searchParams["stats"] = "0";
                queryParams = ObjectToSearchQueryParams(props.searchParams);
                if (queryParams !== "") {
                    queryParams = "&" + queryParams;
                }
            }

            fettingAllRecordsInProgress = true;
            setFettingAllRecordsInProgress(true);
            let res = await fetch(
                "/v1/" + apiNameSpace + "?" +
                Select +
                queryParams +
                "&sort=" +
                props.sortOrder +
                props.sortField +
                "&page=" +
                pageNo +
                "&limit=" +
                size,
                requestOptions
            )
                .then(async (response) => {
                    const isJson = response.headers
                        .get("content-type")
                        ?.includes("application/json");
                    const data = isJson && (await response.json());

                    // check for error response
                    if (!response.ok) {
                        const error = data && data.errors;
                        return Promise.reject(error);
                    }

                    if (!data.result || data.result.length === 0) {
                        return [];
                    }

                    if (data.meta) {
                        model["meta"] = data.meta;
                        /*
                        setTotalSales(data.meta.total_sales);
                        setNetProfit(data.meta.net_profit);
                        setLoss(data.meta.net_loss);
                        setVatPrice(data.meta.vat_price);
                        setTotalPaidSales(data.meta.paid_sales);
                        setTotalUnPaidSales(data.meta.unpaid_sales);
                        setTotalCashSales(data.meta.cash_sales);
                        setTotalBankAccountSales(data.meta.bank_account_sales);
                        setReturnCount(data.meta.return_count);
                        setReturnPaidAmount(data.meta.return_amount);
                        */


                    }


                    // console.log("Orders:", orders);

                    return data.result;


                })
                .catch((error) => {
                    console.log(error);
                    return [];
                    //break;

                });
            if (res.length === 0) {
                break;
            }
            models = models.concat(res);
            pageNo++;
        }//end for loop

        model.models = models;
        setModel({ ...model });
        preparePages();
        fettingAllRecordsInProgress = false;
        setFettingAllRecordsInProgress(false);

        /*
        if (timerRef.current) clearTimeout(timerRef.current);

        timerRef.current = setTimeout(() => {
            model.models = models;
            setModel({ ...model });
            preparePages();
            fettingAllRecordsInProgress = false;
            setFettingAllRecordsInProgress(false);
        }, 200);
        */



        // console.log("model:",model);


    }





    function setInvoiceTitle(modelName) {
        model.modelName = modelName;
        if (model.modelName === "sales_report") {
            model.reportTitle = "SALES REPORT | تقرير المبيعات"
        } else if (model.modelName === "sales_return_report") {
            model.reportTitle = "SALES RETURN REPORT | تقرير مرتجعات المبيعات"
        } else if (model.modelName === "purchase_report") {
            model.reportTitle = "PURCHASE REPORT | تقرير الشراء"
        } else if (model.modelName === "purchase_return_report") {
            model.reportTitle = "PURCHASE RETURN REPORT | تقرير إرجاع المشتريات"
        } else if (model.modelName === "quotation_report") {
            model.reportTitle = "QUOTATION REPORT | تقرير الاقتباس"
        } else if (model.modelName === "quotation_invoice_report") {
            model.reportTitle = "SALES REPORT | تقرير المبيعات"
        } else if (model.modelName === "delivery_note_report") {
            model.reportTitle = "DELIVERY NOTE REPORT | تقرير مذكرة التسليم"
        }
        setModel({ ...model });
    }



    function ObjectToSearchQueryParams(object) {
        return Object.keys(object)
            .map(function (key) {
                return `search[${key}]=${object[key]}`;
            })
            .join("&");
    }

    function changePageSize(size) {
        fontSizes[modelName + "_reportPageSize"] = parseInt(size);
        setFontSizes({ ...fontSizes });
        saveToLocalStorage("fontSizes", fontSizes);
        preparePages();
    }

    function preparePages() {
        if (fontSizes[modelName + "_reportPageSize"]) {
            model.pageSize = fontSizes[modelName + "_reportPageSize"];
        } else {
            model.pageSize = 20
        }



        let totalRecords = model.models.length;
        // let top = 0;
        let totalPagesInt = parseInt(totalRecords / model.pageSize);
        let totalPagesFloat = parseFloat(totalRecords / model.pageSize);

        let totalPages = totalPagesInt;
        if ((totalPagesFloat - totalPagesInt) > 0) {
            totalPages++;
        }

        model.total_pages = totalPages;


        model.pages = [];


        let offset = 0;

        for (let i = 0; i < totalPages; i++) {
            model.pages.push({
                top: 5,
                models: [],
                lastPage: false,
                firstPage: false,
            });
            for (let j = offset; j < totalRecords; j++) {
                model.pages[i].models.push(model.models[j]);
                if (model.pages[i].models.length === model.pageSize) {
                    break;
                }
            }

            // top += 5;
            offset += model.pageSize;

            if (i === 0) {
                model.pages[i].firstPage = true;
            }

            if ((i + 1) === totalPages) {
                model.pages[i].lastPage = true;
            }
        }
        setModel({ ...model });
    }

    /*
        async function getModel(id, modelName) {
            console.log("inside get Order");
            const requestOptions = {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': localStorage.getItem('access_token'),
                },
            };
    
            let searchParams = {};
            if (localStorage.getItem("store_id")) {
                searchParams.store_id = localStorage.getItem("store_id");
            }
            let queryParams = ObjectToSearchQueryParams(searchParams);
    
            let apiPath = "";
            if (modelName && modelName === "sales") {
                apiPath = "order"
            } else if (modelName && modelName === "sales_return") {
                apiPath = "sales-return"
            } else if (modelName && modelName === "purchase") {
                apiPath = "purchase"
            } else if (modelName && modelName === "purchase_return") {
                apiPath = "purchase-return"
            } else if (modelName && modelName === "quotation") {
                apiPath = "quotation"
            } else if (modelName && modelName === "delivery_note") {
                apiPath = "delivery-note"
            }
    
            await fetch('/v1/' + apiPath + '/' + id + "?" + queryParams, requestOptions)
                .then(async response => {
                    const isJson = response.headers.get('content-type')?.includes('application/json');
                    const data = isJson && await response.json();
    
                    // check for error response
                    if (!response.ok) {
                        const error = (data && data.errors);
                        return Promise.reject(error);
                    }
    
                    console.log("Response:");
                    console.log(data);
    
                    model = data.result;
                    setModel({ ...model });
                    return model;
                })
                .catch(error => {
    
                });
        }
    
        async function getOrder(id) {
            console.log("inside get Order");
            const requestOptions = {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': localStorage.getItem('access_token'),
                },
            };
    
            let searchParams = {};
            if (localStorage.getItem("store_id")) {
                searchParams.store_id = localStorage.getItem("store_id");
            }
            let queryParams = ObjectToSearchQueryParams(searchParams);
    
    
    
            await fetch('/v1/order/' + id + "?" + queryParams, requestOptions)
                .then(async response => {
                    const isJson = response.headers.get('content-type')?.includes('application/json');
                    const data = isJson && await response.json();
    
                    // check for error response
                    if (!response.ok) {
                        const error = (data && data.errors);
                        return Promise.reject(error);
                    }
    
                    console.log("Response:");
                    console.log(data);
    
                    model.order = data.result;
                    setModel({ ...model });
    
                    return model;
                })
                .catch(error => {
    
                });
        }
                */


    function handleClose() {
        setShow(false);
    }

    async function getStore(id) {
        console.log("inside get Store");
        const requestOptions = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': localStorage.getItem('access_token'),
            },
        };

        await fetch('/v1/store/' + id, requestOptions)
            .then(async response => {
                const isJson = response.headers.get('content-type')?.includes('application/json');
                const data = isJson && await response.json();

                // check for error response
                if (!response.ok) {
                    const error = (data && data.errors);
                    return Promise.reject(error);
                }

                console.log("Response:");
                console.log(data);
                let storeData = data.result;
                model.store = storeData;
                setModel({ ...model });
            })
            .catch(error => {

            });
    }



    async function getCustomer(id) {
        console.log("inside get Customer");
        const requestOptions = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': localStorage.getItem('access_token'),
            },
        };

        let searchParams = {};
        if (localStorage.getItem("store_id")) {
            searchParams.store_id = localStorage.getItem("store_id");
        }
        let queryParams = ObjectToSearchQueryParams(searchParams);

        await fetch('/v1/customer/' + id + "?" + queryParams, requestOptions)
            .then(async response => {
                const isJson = response.headers.get('content-type')?.includes('application/json');
                const data = isJson && await response.json();

                // check for error response
                if (!response.ok) {
                    const error = (data && data.errors);
                    return Promise.reject(error);
                }

                console.log("Customer Response:");
                console.log(data);
                let customerData = data.result;
                model.customer = customerData;
                setModel({ ...model });
            })
            .catch(error => {

            });
    }

    async function getVendor(id) {
        console.log("inside get Customer");
        const requestOptions = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': localStorage.getItem('access_token'),
            },
        };

        let searchParams = {};
        if (localStorage.getItem("store_id")) {
            searchParams.store_id = localStorage.getItem("store_id");
        }
        let queryParams = ObjectToSearchQueryParams(searchParams);

        await fetch('/v1/vendor/' + id + "?" + queryParams, requestOptions)
            .then(async response => {
                const isJson = response.headers.get('content-type')?.includes('application/json');
                const data = isJson && await response.json();

                // check for error response
                if (!response.ok) {
                    const error = (data && data.errors);
                    return Promise.reject(error);
                }

                console.log("Customer Response:");
                console.log(data);
                let vendorData = data.result;
                model.vendor = vendorData;
                setModel({ ...model });
            })
            .catch(error => {

            });
    }
    /*
        function getUser(id) {
            console.log("inside get User(Delivered by)");
            const requestOptions = {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': localStorage.getItem('access_token'),
                },
            };
    
            fetch('/v1/user/' + id, requestOptions)
                .then(async response => {
                    const isJson = response.headers.get('content-type')?.includes('application/json');
                    const data = isJson && await response.json();
    
                    // check for error response
                    if (!response.ok) {
                        const error = (data && data.errors);
                        return Promise.reject(error);
                    }
    
    
                    console.log("Response:");
                    console.log(data);
                    let userData = data.result;
                    model.delivered_by_user = userData;
                    setModel({ ...model });
                })
                .catch(error => {
    
                });
        }
                */



    const printAreaRef = useRef();

    const getFileName = useCallback(() => {
        let filename = "";

        if (modelName === "sales_report") {
            filename = "Sales_Report";
        } else if (modelName === "sales_return_report") {
            filename = "Sales_Return_Report";
        } else if (modelName === "purchase_report") {
            filename = "Purchase_Report";
        } else if (modelName === "purchase_return_report") {
            filename = "Purchase_Return_Report";
        } else if (modelName === "quotation_report") {
            filename = "Quotation_Report";
        } else if (modelName === "quotation_invoice_report") {
            filename = "Sales_Report";
        } else if (modelName === "delivery_note_report") {
            filename = "Delivery_Note_Report";
        }

        return filename;
    }, [modelName])



    const handlePrint = useCallback(() => {
        const element = printAreaRef.current;
        if (!element) return;

        html2pdf().from(element).set({
            margin: 0,
            filename: `${getFileName()}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        }).outputPdf('bloburl').then(blobUrl => {
            const iframe = document.createElement('iframe');
            iframe.style.display = 'none';
            iframe.src = blobUrl;
            document.body.appendChild(iframe);

            iframe.onload = () => {
                iframe.contentWindow?.focus();
                iframe.contentWindow?.print();
            };
        });
    }, [getFileName]);



    /*
    const handlePrint = async () => {
      const element = printAreaRef.current;
      if (!element) return;
    
      const canvas = await html2canvas(element, {
          scale: 2,
          useCORS: true,
      });
    
      const imgData = canvas.toDataURL("image/jpeg", 1.0);
      const pdf = new jsPDF("p", "mm", "a4");
    
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
    
      pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${getFileName()}.pdf`);
    };*/

    /*
     
     
            const handlePrint = useCallback(async () => {
                const element = printAreaRef.current;
                if (!element) return;
     
                const opt = {
                    margin: 0,
                    filename: `${getFileName()}.pdf`,
                    image: { type: 'jpeg', quality: 0.98 },
                    html2canvas: { scale: 2, useCORS: true, logging: true },
                    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
                };
     
                const pdfBlob = await html2pdf().from(element).set(opt).outputPdf('blob');
     
                // Create a blob URL
                const blobUrl = URL.createObjectURL(pdfBlob);
     
                // Open the PDF in a new window or iframe and trigger print
                const printWindow = window.open(blobUrl);
                if (printWindow) {
                    printWindow.onload = function () {
                        printWindow.focus();
                        printWindow.print();
                    };
                } else {
                    alert("Popup blocked! Please allow popups for this website.");
                }
            }, [getFileName]);
            */
    /*
    const handlePrint = useReactToPrint({
        content: () => printAreaRef.current,
        documentTitle: getFileName(),
        onAfterPrint: () => {
            handleClose();
        }
    });*/

    /*
    const saveFileToServer = useReactToPrint({
        content: () => printAreaRef.current,
        documentTitle: getFileName(),
        onAfterPrint: () => {
            handleClose();
        }
    });*/

    // Wrap handlePrint in useCallback to avoid unnecessary re-creations
    /* const autoPrint = useCallback(() => {
         handlePrint();
     }, [handlePrint]);*/

    /*
    const formatPhoneForWhatsApp = useCallback((number) => {
       // Step 1: Remove all non-digit characters
       number = number.replace(/\D/g, '');
    
       // Step 2: Replace starting 05 with 9665
       if (number.startsWith('05')) {
           number = '966' + number.slice(1);
       }
    
       return number;
    }, [])*/

    /*
    const openWhatsAppShare = useCallback(async (phone) => {
        console.log("Inside openWhatsAppShare")
        const element = printAreaRef.current;
        if (!element) return;
    
        const opt = {
            margin: 0,
            filename: `${getFileName()}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, logging: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };
    
        const pdfBlob = await html2pdf().from(element).set(opt).outputPdf('blob');
    
        // Upload to your server
        const formData = new FormData();
        formData.append("file", pdfBlob, `${getFileName()}.pdf`);
    
        await fetch("/v1/upload-pdf", { method: "POST", body: formData });
        // const { fileUrl } = await res.json();
    
    
        let whatsAppNo = "";
    
        if (phone) {
            whatsAppNo = phone;
        } else if (model.customer?.phone) {
            whatsAppNo = model.customer?.phone
        } else if (model.vendor?.phone) {
            whatsAppNo = model.vendor?.phone
        }
    
    
        if (!whatsAppNo) {
            whatsAppNo = prompt("Enter the WhatsApp number (with country code, e.g., 9665xxxxxxxx):");
    
            if (!whatsAppNo) {
                // User cancelled or entered nothing
                alert("No number entered. Cannot send message.");
                handleClose();
                return;
            }
        }
    
    
    
        whatsAppNo = formatPhoneForWhatsApp(whatsAppNo);
        let message = "";
        if (modelName === "quotation" && model?.type !== "invoice") {
            message = `Hello, here is your Quotation:\n${window.location.origin}/pdfs/${getFileName()}.pdf`;
        } else {
            message = `Hello, here is your Invoice:\n${window.location.origin}/pdfs/${getFileName()}.pdf`;
        }
    
        const whatsappUrl = `https://wa.me/${whatsAppNo}?text=${encodeURIComponent(message)}`;
    
        window.open(whatsappUrl, "_blank");
        handleClose();
    
    }, [getFileName, model, formatPhoneForWhatsApp, modelName]);
    */


    /*  useEffect(() => {
           // Automatically trigger print when component is mounted
           console.log("whatsAppShare:", whatsAppShare);
           const timeout = setTimeout(() => {
               if (whatsAppShare) {
                   // openWhatsAppShare();
               } else {
                   // autoPrint();
               }
           }, 800); // give some buffer for content to render
     
           return () => clearTimeout(timeout); // clean up
     
       }, [autoPrint, whatsAppShare, openWhatsAppShare]);*/

    const [showSlider, setShowSlider] = useState(false);
    let [selectedText, setSelectedText] = useState("");

    const defaultFontSizes = useMemo(() => ({
        "pageSize": 15,
        "reportPageSize": 20,
        "font": "Cairo",
        "marginTop": {
            "value": 0,
            "unit": "px",
            "size": "0px",
            "step": 3
        },
        "storeHeader": {
            "visible": true,
        },
        "storeName": {
            "value": 3.5,
            "unit": "mm",
            "size": "3.5mm",
            "step": 0.1,
        },
        "storeTitle": {
            "value": 2.8,
            "unit": "mm",
            "size": "3.8mm",
            "step": 0.1,
        },
        "storeCR": {
            "value": 2.2,
            "unit": "mm",
            "size": "2.2mm",
            "step": 0.1,
        },
        "storeVAT": {
            "value": 2.2,
            "unit": "mm",
            "size": "2.2mm",
            "step": 0.1,
        },
        "storeNameArabic": {
            "value": 3.5,
            "unit": "mm",
            "size": "3.5mm",
            "step": 0.1,
        },
        "storeTitleArabic": {
            "value": 2.8,
            "unit": "mm",
            "size": "3.8mm",
            "step": 0.1,
        },
        "storeCRArabic": {
            "value": 2.2,
            "unit": "mm",
            "size": "2.2mm",
            "step": 0.1,
        },
        "storeVATArabic": {
            "value": 2.2,
            "unit": "mm",
            "size": "2.2mm",
            "step": 0.1,
        },
        "invoiceTitle": {
            "value": 3,
            "unit": "mm",
            "size": "3mm",
            "step": 0.1,
        },
        "invoiceDetails": {
            "value": 2.2,
            "unit": "mm",
            "size": "2.2mm",
            "step": 0.1,
        },
        "invoicePageCount": {
            "value": 2.2,
            "unit": "mm",
            "size": "2.2mm",
            "step": 0.1,
        },
        "tableHead": {
            "value": 2.2,
            "unit": "mm",
            "size": "2.2mm",
            "step": 0.1,
        },
        "tableBody": {
            "value": 2.2,
            "unit": "mm",
            "size": "2.2mm",
            "step": 0.1,
        },
        "tableFooter": {
            "value": 2.2,
            "unit": "mm",
            "size": "2.2mm",
            "step": 0.1,
        },
        "signature": {
            "value": 2.2,
            "unit": "mm",
            "size": "2.2mm",
            "step": 0.1,
        },
        "footer": {
            "value": 2.2,
            "unit": "mm",
            "size": "2.2mm",
            "step": 0.1,
        },
        "bankAccountHeader": {
            "value": 2.2,
            "unit": "mm",
            "size": "2.2mm",
            "step": 0.1,
        },
        "bankAccountBody": {
            "value": 2.2,
            "unit": "mm",
            "size": "2.2mm",
            "step": 0.1,
        },
    }), []);

    const selectText = (name) => {
        selectedText = name;
        setSelectedText(name);
        if (!fontSizes[modelName + "_" + selectedText]) {
            fontSizes[modelName + "_" + selectedText] = defaultFontSizes[selectedText];
        }
        setShowSlider(true);
    };

    const saveToLocalStorage = useCallback((key, obj) => {
        localStorage.setItem(key, JSON.stringify(obj));
    }, []);

    const getFromLocalStorage = useCallback((key) => {
        const stored = localStorage.getItem(key);
        return stored ? JSON.parse(stored) : null;
    }, []);


    let [fontSizes, setFontSizes] = useState(defaultFontSizes);

    useEffect(() => {
        let storedFontSizes = getFromLocalStorage("fontSizes");
        if (storedFontSizes) {
            setFontSizes({ ...storedFontSizes });
        } else {
            storedFontSizes = {};
        }

        let modelNames = ["sales", "sales_report", "sales_return", "sales_return_report", "purchase", "purchase_report", "purchase_return", "purchase_return_report", "quotation", "quotation_report", "quotation_invoice_report", "delivery_note", "delivery_note_report"];
        for (let key1 in modelNames) {
            for (let key2 in defaultFontSizes) {
                if (!storedFontSizes[modelNames[key1] + "_" + key2]) {
                    storedFontSizes[modelNames[key1] + "_" + key2] = defaultFontSizes[key2];
                }
            }
        }

        setFontSizes({ ...storedFontSizes });
        saveToLocalStorage("fontSizes", storedFontSizes);


    }, [setFontSizes, defaultFontSizes, saveToLocalStorage, getFromLocalStorage]);


    const increment = () => {
        if (selectedText) {
            if (!fontSizes[modelName + "_" + selectedText]) {
                fontSizes[modelName + "_" + selectedText] = defaultFontSizes[selectedText];
            }

            fontSizes[modelName + "_" + selectedText].value += fontSizes[modelName + "_" + selectedText].step;
            fontSizes[modelName + "_" + selectedText]["value"] = parseFloat(Math.min(fontSizes[modelName + "_" + selectedText]?.value).toFixed(2));
            fontSizes[modelName + "_" + selectedText]["size"] = fontSizes[modelName + "_" + selectedText]?.value + fontSizes[modelName + "_" + selectedText]?.unit;
            setFontSizes({ ...fontSizes });
            saveToLocalStorage("fontSizes", fontSizes);
        }
    };

    const decrement = (element) => {
        if (selectedText) {
            if (!fontSizes[modelName + "_" + selectedText]) {
                fontSizes[modelName + "_" + selectedText] = defaultFontSizes[selectedText];
            }

            fontSizes[modelName + "_" + selectedText].value -= fontSizes[modelName + "_" + selectedText].step;
            fontSizes[modelName + "_" + selectedText].value = parseFloat(Math.min(fontSizes[modelName + "_" + selectedText].value).toFixed(2));
            fontSizes[modelName + "_" + selectedText].size = fontSizes[modelName + "_" + selectedText].value + fontSizes[modelName + "_" + selectedText].unit;
            setFontSizes({ ...fontSizes });
            saveToLocalStorage("fontSizes", fontSizes);
        }
    };


    const incrementSize = (element) => {
        if (element) {
            if (!fontSizes[element]) {
                fontSizes[element] = defaultFontSizes[element];
            }

            fontSizes[element].value += fontSizes[element].step;
            fontSizes[element]["value"] = parseFloat(Math.min(fontSizes[element]?.value).toFixed(2));
            fontSizes[element]["size"] = fontSizes[element]?.value + fontSizes[element]?.unit;
            setFontSizes({ ...fontSizes });
            saveToLocalStorage("fontSizes", fontSizes);
        }
    };

    const decrementSize = (element) => {
        if (element) {
            if (!fontSizes[element]) {
                fontSizes[element] = defaultFontSizes[element];
            }

            fontSizes[element].value -= fontSizes[element].step;
            fontSizes[element].value = parseFloat(Math.min(fontSizes[element].value).toFixed(2));
            fontSizes[element].size = fontSizes[element].value + fontSizes[element].unit;
            setFontSizes({ ...fontSizes });
            saveToLocalStorage("fontSizes", fontSizes);
        }
    };

    function formatModelName(str) {
        return str
            .replace(/_/g, ' ')                   // Replace _ with space
            .split(' ')                            // Split by spaces
            .map(word =>
                word.charAt(0).toUpperCase() + word.slice(1).toLowerCase() // Capitalize
            )
            .join(' ');                            // Join words back with space
    }


    const fonts = [
        { label: 'Calibri Light', value: "Calibri Light" },
        { label: 'IBM Plex Sans Arabic Regular', value: "IBM Plex Sans Arabic Regular" },
        { label: 'Sakkal Majalla', value: 'Sakkal Majalla' },
        { label: 'Arial', value: 'Arial' },
        { label: 'Tahoma', value: 'Tahoma' },
        { label: 'Akhbar Regular', value: 'Akhbar Regular' },
        { label: 'Thuluth Regular', value: 'Thuluth Regular' },
        { label: 'Simplified Arabic', value: 'Simplified Arabic' },
        { label: 'Traditional Arabic', value: 'Traditional Arabic' },
        { label: 'Andulus', value: 'Andulus' },
        { label: 'Noto Naskh Bold', value: 'Noto Naskh Bold' },
        { label: 'Noto Naskh Semi Bold', value: 'Noto Naskh Semi Bold' },
        { label: 'Noto Naskh Regular', value: 'Noto Naskh Regular' },
        { label: 'Noto Naskh Medium', value: 'Noto Naskh Medium' },
        { label: 'Wafeq Regular', value: 'Wafeq Regular' },
        { label: 'Wafeq Light', value: 'Wafeq Light' },
        { label: 'Cairo', value: 'Cairo' },
        { label: 'Amiri', value: 'Amiri' },
        { label: 'Noto Naskh Arabic', value: '"Noto Naskh Arabic"' },
        { label: 'Noto Kufi Arabic', value: '"Noto Kufi Arabic"' },
        { label: 'Changa', value: 'Changa' },
        { label: 'Lateef', value: 'Lateef' },
        { label: 'Harmattan', value: 'Harmattan' },
        { label: 'Scheherazade New', value: '"Scheherazade New"' },
        { label: 'Reem Kufi', value: '"Reem Kufi"' },
        { label: 'El Messiri', value: '"El Messiri"' },
        { label: 'Tajawal', value: 'Tajawal' },
        { label: 'Almarai', value: 'Almarai' },
        { label: 'Markazi Text', value: '"Markazi Text"' },
        { label: 'Aref Ruqaa', value: '"Aref Ruqaa"' },
        { label: 'Baloo Bhaijaan 2', value: '"Baloo Bhaijaan 2"' }
    ];

    //const [selectedFont, setSelectedFont] = useState(fontSizes[modelName + "_font"]);

    const handleFontChange = (e) => {
        // setSelectedFont(e.target.value);
        fontSizes[modelName + "_font"] = e.target.value;
        setFontSizes({ ...fontSizes })
        saveToLocalStorage("fontSizes", fontSizes);
    };





    return (<>
        <Modal show={show} scrollable={true} size="xl" fullscreen onHide={handleClose} animation={false}>
            <Modal.Header className="d-flex flex-wrap align-items-center justify-content-between">
                {/* Left: Title */}
                <div className="flex-grow-1">
                    <Modal.Title>{formatModelName(modelName)} Preview</Modal.Title>
                </div>

                {/* Right: Fixed control block */}
                <div className="d-flex flex-wrap align-items-center" style={{ gap: '10px' }}>
                    {/* Slider */}
                    {showSlider && (
                        <div className="d-flex align-items-center border rounded bg-light p-2">
                            <button className="btn btn-outline-secondary" onClick={decrement}>−</button>
                            <span className="mx-2">Font Size: {fontSizes[modelName + "_" + selectedText]?.size}</span>
                            <button className="btn btn-outline-secondary" onClick={increment}>+</button>
                            <button className="btn-close ms-2" onClick={() => setShowSlider(false)}></button>
                        </div>
                    )}

                    <label htmlFor="font-select">Select Font: </label>
                    <select id="font-select" value={fontSizes[modelName + "_font"]} onChange={handleFontChange}>
                        {fonts.map((font) => (
                            <option key={font.value} value={font.value}>
                                {font.label}
                            </option>
                        ))}
                    </select>

                    {/* Show Store Header - Always fixed here */}
                    {<div className="form-check">
                        <input
                            type="checkbox"
                            className="form-check-input"
                            id="storeHeaderCheck"
                            checked={fontSizes[modelName + "_storeHeader"]?.visible}
                            onChange={() => {
                                if (!fontSizes[modelName + "_storeHeader"]) {
                                    fontSizes[modelName + "_storeHeader"] = defaultFontSizes["storeHeader"];
                                }
                                fontSizes[modelName + "_storeHeader"].visible = !fontSizes[modelName + "_storeHeader"]?.visible;

                                setFontSizes({ ...fontSizes });

                                saveToLocalStorage("fontSizes", fontSizes);
                            }}
                        />
                        <label htmlFor="storeHeaderCheck" className="form-check-label">Show Store Header</label>
                    </div>}



                    {/* Margin Control */}

                    {<div className="d-flex align-items-center border rounded bg-light p-2" style={{ marginRight: "200px" }}>
                        <button className="btn btn-outline-secondary" onClick={() => decrementSize(modelName + "_marginTop")}>−</button>
                        <span className="mx-2">Margin Top: {fontSizes[modelName + "_marginTop"]?.size}</span>
                        <button className="btn btn-outline-secondary" onClick={() => incrementSize(modelName + "_marginTop")}>+</button>

                    </div>}

                    <div className="col ">
                        <>
                            <label className="form-label">Page Size:&nbsp;</label>
                            <select
                                value={fontSizes[modelName + "_reportPageSize"]}
                                onChange={(e) => {
                                    changePageSize(e.target.value);
                                }}
                                className="form-control pull-right"
                                style={{
                                    border: "solid 1px",
                                    borderColor: "silver",
                                    width: "55px",
                                }}
                            >
                                <option value="5">5</option>
                                <option value="6">6</option>
                                <option value="7">7</option>
                                <option value="8">8</option>
                                <option value="9">9</option>
                                <option value="10">10</option>
                                <option value="11">11</option>
                                <option value="12">12</option>
                                <option value="13">13</option>
                                <option value="14">14</option>
                                <option value="15">15</option>
                                <option value="16">16</option>
                                <option value="17">16</option>
                                <option value="18">18</option>
                                <option value="19">19</option>
                                <option value="20">20</option>
                                <option value="21">21</option>
                                <option value="22">22</option>
                                <option value="23">23</option>
                                <option value="24">24</option>
                                <option value="25">25</option>
                                <option value="26">26</option>
                                <option value="27">27</option>
                                <option value="28">28</option>
                                <option value="29">29</option>
                                <option value="30">30</option>
                            </select>
                        </>
                    </div>




                    {/* Print & Close Buttons */}
                    <div className="d-flex align-items-center">
                        <Button
                            variant={"primary"}
                            onClick={handlePrint}
                            className="me-2"
                        >
                            <>
                                <i className="bi bi-printer"></i> Print
                            </>
                        </Button>
                        <button className="btn-close" onClick={handleClose} aria-label="Close"></button>
                    </div>
                </div>
            </Modal.Header>


            <Modal.Body>
                <div ref={printAreaRef} className="print-area" id="print-area">
                    {fettingAllRecordsInProgress && (
                        <div
                            style={{
                                display: "flex",
                                justifyContent: "center",
                                alignItems: "center",
                                height: "300px", // or use "100vh" for full page height
                                width: "100%"
                            }}
                        >
                            <Spinner animation="grow" variant="primary" />
                        </div>
                    )}

                    <ReportContent model={model} modelName={modelName} selectText={selectText} fontSizes={fontSizes} />

                </div>
            </Modal.Body>
            <Modal.Footer>
            </Modal.Footer>
        </Modal >
    </>);

});

export default ReportPreview;