import { supabase } from "@/lib/supabaseClient";

export type OfferTemplateRecord = {
  id: string;
  company_id: string;
  storage_path: string;
  file_name: string | null;
  file_size: number | null;
  detected_fields: string[] | null;
  fields_mapping: Record<string, string> | null;
  uploaded_at: string | null;
  updated_at: string | null;
};

export async function fetchOfferTemplate(
  companyId: string,
): Promise<OfferTemplateRecord | null> {
  const { data, error } = await supabase
    .from("offer_templates")
    .select("*")
    .eq("company_id", companyId)
    .maybeSingle();

  if (error && error.code !== "PGRST116") throw error;
  return (data as OfferTemplateRecord) ?? null;
}

export async function upsertOfferTemplate(payload: {
  company_id: string;
  storage_path: string;
  file_name?: string;
  file_size?: number;
  detected_fields?: string[];
  fields_mapping?: Record<string, string>;
  uploaded_by?: string | null;
}): Promise<OfferTemplateRecord> {
  const { data, error } = await supabase
    .from("offer_templates")
    .upsert(
      {
        ...payload,
      },
      { onConflict: "company_id" },
    )
    .select()
    .single();

  if (error) throw error;
  return data as OfferTemplateRecord;
}

export async function updateOfferTemplateMapping(
  id: string,
  fieldsMapping: Record<string, string>,
): Promise<void> {
  const { error } = await supabase
    .from("offer_templates")
    .update({ fields_mapping: fieldsMapping })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteOfferTemplate(id: string): Promise<void> {
  const { error } = await supabase
    .from("offer_templates")
    .delete()
    .eq("id", id);
  if (error) throw error;
}





















