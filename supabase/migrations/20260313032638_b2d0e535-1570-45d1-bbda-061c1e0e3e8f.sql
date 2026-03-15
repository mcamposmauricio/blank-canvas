
CREATE OR REPLACE FUNCTION public.search_help_articles(
  p_tenant_id uuid,
  p_query text,
  p_limit int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  title text,
  subtitle text,
  slug text,
  relevance int,
  body_snippet text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  q text := trim(p_query);
  q_like text := '%' || q || '%';
BEGIN
  RETURN QUERY
  SELECT
    a.id,
    a.title,
    a.subtitle,
    a.slug,
    CASE
      WHEN a.title ILIKE q THEN 1
      WHEN a.title ILIKE q_like THEN 2
      WHEN a.subtitle ILIKE q_like THEN 3
      ELSE 4
    END AS relevance,
    CASE
      WHEN a.title ILIKE q_like OR a.subtitle ILIKE q_like THEN NULL::text
      ELSE (
        SELECT substring(
          regexp_replace(
            (SELECT string_agg(elem->>'text', ' ')
             FROM jsonb_array_elements(
               CASE jsonb_typeof(v.editor_schema_json->'content')
                 WHEN 'array' THEN v.editor_schema_json->'content'
                 ELSE '[]'::jsonb
               END
             ) AS block,
             jsonb_array_elements(
               CASE jsonb_typeof(block->'content')
                 WHEN 'array' THEN block->'content'
                 ELSE '[]'::jsonb
               END
             ) AS elem
             WHERE elem->>'text' IS NOT NULL
            ),
            '\s+', ' ', 'g'
          ),
          GREATEST(1, position(lower(q) in lower(
            (SELECT string_agg(elem->>'text', ' ')
             FROM jsonb_array_elements(
               CASE jsonb_typeof(v.editor_schema_json->'content')
                 WHEN 'array' THEN v.editor_schema_json->'content'
                 ELSE '[]'::jsonb
               END
             ) AS block,
             jsonb_array_elements(
               CASE jsonb_typeof(block->'content')
                 WHEN 'array' THEN block->'content'
                 ELSE '[]'::jsonb
               END
             ) AS elem
             WHERE elem->>'text' IS NOT NULL
            )
          )) - 30),
          120
        )
        FROM help_article_versions v
        WHERE v.id = a.current_version_id
      )
    END AS body_snippet
  FROM help_articles a
  LEFT JOIN help_article_versions v ON v.id = a.current_version_id
  WHERE a.tenant_id = p_tenant_id
    AND a.status = 'published'
    AND (
      a.title ILIKE q_like
      OR a.subtitle ILIKE q_like
      OR EXISTS (
        SELECT 1 FROM help_article_versions hv
        WHERE hv.id = a.current_version_id
        AND (
          SELECT string_agg(elem->>'text', ' ')
          FROM jsonb_array_elements(
            CASE jsonb_typeof(hv.editor_schema_json->'content')
              WHEN 'array' THEN hv.editor_schema_json->'content'
              ELSE '[]'::jsonb
            END
          ) AS block,
          jsonb_array_elements(
            CASE jsonb_typeof(block->'content')
              WHEN 'array' THEN block->'content'
              ELSE '[]'::jsonb
            END
          ) AS elem
          WHERE elem->>'text' IS NOT NULL
        ) ILIKE q_like
      )
    )
  ORDER BY relevance, a.updated_at DESC
  LIMIT p_limit;
END;
$$;
