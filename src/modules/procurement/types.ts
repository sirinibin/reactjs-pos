// Data models for the procurement module (procurement.md §4).

export type RFQStatus = 'received' | 'processing' | 'ready_to_send' | 'forwarded' | 'failed' | 'ignored' | 'cancelled';

export interface RFQProduct { product_id?: string; part_no?: string; name: string; name_in_arabic?: string; quantity?: number; unit?: string; notes?: string }
export interface RFQForwardRecord { supplier_id?: string; supplier_name?: string; phone: string; sent_from_phone?: string; purchase_market?: string; category?: string; google_maps_url?: string; sent_message?: string; sent_at?: string; status?: 'pending' | 'sent' | 'failed' | string; error_msg?: string }
export interface SupplierReplyPrice { product_index: number; part_no?: string; product_name?: string; quantity?: number; unit_price: number; currency?: string; vat_included?: boolean; notes?: string }
export interface SupplierReply {
  id: string; supplier_id?: string; supplier_name?: string; supplier_phone?: string; supplier_email?: string; received_at?: string; raw_text?: string; media_urls?: string[];
  is_quotation?: boolean; general_notes?: string; prices?: SupplierReplyPrice[]; extraction_status?: 'pending' | 'done' | 'failed' | string; extraction_error?: string; source?: string;
  procurement_message_id?: string; procurement_message_code?: string;
}
export interface RFQActivityLog { id?: string; at: string; step: string; message: string; icon?: string; color?: string; details?: Record<string, any> }

export interface RFQ {
  id: string; store_id?: string; code: string; received_at?: string; source?: 'whatsapp' | 'email' | 'manual' | string; from_phone?: string; from_name?: string;
  message_type?: string; text_content?: string; media_urls?: string[]; documents?: { url: string; file_name?: string; mime_type?: string }[]; categories?: string[];
  products?: RFQProduct[]; extracted_text?: string; customer_id?: string; customer_name?: string; customer_contact_person?: string; customer_phone?: string; customer_email?: string;
  customer_company?: string; customer_address?: string; customer_vat_no?: string; customer_cr_no?: string; customer_national_address?: string; customer_city?: string;
  status?: RFQStatus | string; processed_at?: string; forwarded_to?: RFQForwardRecord[]; matched_supplier_ids?: string[]; error_msg?: string; supplier_replies?: SupplierReply[];
  activity_logs?: RFQActivityLog[]; customer_rfq_id?: string; prepared_by?: string; authorized_by?: string; procurement_message_id?: string; procurement_message_code?: string;
  attachment_urls?: string[]; additional_attachment_urls?: string[]; additional_attachment_filenames?: string[]; general_instructions?: string; quotation_ids?: string[]; quotation_codes?: string[];
  store?: Record<string, any>;
}

export interface RFQSupplier {
  id?: string; store_id?: string; code?: string; name: string; phone: string; phone2?: string; address?: string; latitude?: number; longitude?: number; categories?: string[];
  rating?: number; google_place_id?: string; google_maps_url?: string; purchase_market?: string; website?: string; email?: string; is_active?: boolean; added_at?: string; created_by?: string;
}

export interface Attachment { filename?: string; content_type?: string; size?: number; url?: string }
export interface ProcurementMessage {
  id: string; store_id?: string; type: 'email' | 'whatsapp'; direction: 'in' | 'out'; provider?: string; from?: string; to?: string[]; subject?: string; body_text?: string; body_html?: string;
  wa_message_type?: string; attachments?: Attachment[]; attachment_missing?: boolean; read?: boolean; processed_as_rfq?: boolean; rfq_received_id?: string; rfq_received_code?: string;
  is_supplier_quotation?: boolean; linked_rfq_received_id?: string; linked_rfq_received_code?: string; message_date?: string; code?: string; sender_name?: string; sender_type?: string; created_at?: string;
}
export interface ContactThread { contact_phone: string; last_message_text?: string; last_message_type?: string; last_message_date?: string; unread_count?: number; message_count?: number; sender_name?: string; sender_type?: string; pinned?: boolean }

export interface ExtractResult {
  customer_name?: string; customer_contact_person?: string; customer_phone?: string; customer_email?: string; customer_company?: string; customer_vat_no?: string; customer_cr_no?: string;
  customer_national_address?: string; customer_city?: string; products?: RFQProduct[]; product_categories?: string[]; general_instructions?: string; text_content?: string; llm_model?: string;
}

export interface SendPreviewSupplier { id?: string; name: string; phone: string; category?: string; categories?: string[]; category_matched?: boolean; address?: string; website?: string; google_maps_url?: string; rating?: number; purchase_market?: string }
export interface TemplateComponent { type: string; format?: string; text?: string; parameters?: any[]; example?: any }
export interface SendPreview {
  rfq_id: string; rfq_code: string; rfq_categories?: string[]; template_name?: string; template_language?: string; template_body?: string; template_components?: TemplateComponent[] | null;
  pre_filled_vars?: Record<string, string>; has_image_header?: boolean; suppliers?: SendPreviewSupplier[] | null; store_name?: string; config_warning?: string; error?: string;
}
