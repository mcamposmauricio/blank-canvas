

# Plano: Seed de 5 Empresas + 5 Contatos de Teste

## O que será feito

Criar uma edge function temporária `seed-test-data` que insere no tenant `50740c0a-af12-4c44-abb7-95999dc6e172` (seu tenant):

### 5 Empresas (tabela `contacts`, `is_company = true`)
| Nome | Email | CNPJ | Setor | Cidade/UF |
|---|---|---|---|---|
| Tech Solutions Ltda | contato@techsolutions.com.br | 12345678000190 | Tecnologia | São Paulo/SP |
| Agro Forte SA | contato@agroforte.com.br | 98765432000110 | Agronegócio | Ribeirão Preto/SP |
| Educação Digital ME | admin@edudigital.com.br | 11223344000155 | Educação | Curitiba/PR |
| Saúde Mais Ltda | contato@saudemais.com.br | 55667788000199 | Saúde | Belo Horizonte/MG |
| Logística Express SA | ops@logexpress.com.br | 99887766000133 | Logística | Rio de Janeiro/RJ |

### 5 Contatos (tabela `company_contacts`, 1 por empresa)
| Nome | Email | Cargo | Depto | Empresa |
|---|---|---|---|---|
| Carlos Silva | carlos@techsolutions.com.br | CTO | Tecnologia | Tech Solutions |
| Maria Oliveira | maria@agroforte.com.br | Gerente Comercial | Vendas | Agro Forte |
| João Santos | joao@edudigital.com.br | Diretor Acadêmico | Educação | Educação Digital |
| Ana Costa | ana@saudemais.com.br | Coordenadora | Operações | Saúde Mais |
| Pedro Lima | pedro@logexpress.com.br | Gerente de Logística | Operações | Logística Express |

## Implementacao

1. Criar edge function `seed-test-data` que usa service role key para inserir os dados (bypass RLS)
2. Deploy e executar a function uma vez
3. Deletar a edge function após execução (dados já persistidos)

