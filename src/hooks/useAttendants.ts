import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

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
  const [attendants, setAttendants] = useState<AttendantProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAttendants = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("attendant_profiles")
      .select("*")
      .order("display_name");

    setAttendants((data as AttendantProfile[]) ?? []);
    setLoading(false);
  }, []);

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
