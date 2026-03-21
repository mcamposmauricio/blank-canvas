

# Fix: Widget embed usando URL do Supabase errada

## Problema

O arquivo `public/nps-chat-embed.js` tem a URL do Supabase **hardcoded errada** na linha 10:

```javascript
var supabaseUrl = "https://mfmkxpdufcbwydixbbbe.supabase.co";  // ERRADO
```

O projeto correto é `ydnblcgygkbqioowbnhz`. Por isso, todas as chamadas do widget (`get-widget-config`, `resolve-chat-visitor`, `get-visitor-banners`) vão para o projeto errado e retornam `invalid_api_key`.

A API key `chat_cd4e3b7...` existe no banco e está ativa -- o problema é apenas a URL.

## Correção

**Arquivo:** `public/nps-chat-embed.js` -- linha 10

Trocar:
```javascript
var supabaseUrl = "https://mfmkxpdufcbwydixbbbe.supabase.co";
```

Por:
```javascript
var supabaseUrl = "https://ydnblcgygkbqioowbnhz.supabase.co";
```

1 linha alterada, 0 migrações SQL.

