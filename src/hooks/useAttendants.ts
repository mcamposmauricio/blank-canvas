import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface AttendantProfile {
  id: string;
  user_id: string;
  csm_id: string;
  display_name: string;
  avatar_url: string | null;
  status: string;
  max_conversations: number;
  active_conversations: number;
  created_at: string;
  updated_at: string;
}

export function useAttendants() {
  const { tenantId } = useAuth();
  const [attendants, setAttendants] = useState<AttendantProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAttendants = useCallback(async () => {
    if (!tenantId) { setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from("attendant_profiles")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("display_name");

    setAttendants((data as AttendantProfile[]) ?? []);
    setLoading(false);
  }, [tenantId]);

  useEffect(() => {
    fetchAttendants();
  }, [fetchAttendants]);

  const updateStatus = async (attendantId: string, status: string) => {
    await supabase
      .from("attendant_profiles")
      .update({ status })
      .eq("id", attendantId);
    await fetchAttendants();
  };

  return { attendants, loading, refetch: fetchAttendants, updateStatus };
}
