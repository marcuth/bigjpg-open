# bigjpg-open

Cliente TypeScript para a **API aberta (oficial)** do [Bigjpg](https://bigjpg.com/api), usada para ampliar imagens com IA. Requer conta paga e uma chave de API.

## Instalação

```bash
npm install bigjpg-open
```

Requer Node.js 18+ (usa `fetch` nativo).

## Uso

```ts
import { BigjpgOpen } from "bigjpg-open"

const client = new BigjpgOpen({ apiKey: process.env.BIGJPG_API_KEY! })

// A partir de uma URL pública
const task = await client.enlarge({
    input: "https://example.com/image.jpg",
    style: "photo",
    noise: 1,
    scale: 4,
})
console.log(task.url)

// A partir de um arquivo local
import { readFile } from "node:fs/promises"

const result = await client.enlarge({
    input: { data: await readFile("image.png"), filename: "image.png", filetype: "image/png" },
    scale: 2,
})
```

### Controle manual

```ts
const { tid } = await client.createTask({ input: url })
const task = await client.getTask(tid) // status: "new" | "process" | "success" | "error"
await client.waitForTask(tid, { interval: 3000, timeout: 600_000 })
await client.retryTasks([tid])
```

## Opções

| Opção   | Valores                    | Padrão |
| ------- | -------------------------- | ------ |
| `style` | `"art"`, `"photo"`         | `"art"` |
| `noise` | `-1` (nenhum) a `3` (máximo) | `3`    |
| `scale` | `2`, `4`, `8`, `16`        | `2`    |

Contas gratuitas estão limitadas a `scale` 2 e 4.

## Erros

Falhas lançam `BigjpgError` com `code`: `valid_api_key_required`, `requires_vip`, `month_limit`, `param_error`, `input_url_error`, `task_failed`, `timeout`.

## Licença

MIT
