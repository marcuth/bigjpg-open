# bigjpg-open

Cliente TypeScript para a API aberta do [Bigjpg](https://bigjpg.com) (a mesma que o site usa), para ampliar imagens com IA. Não precisa de chave de API.

## Instalação

```bash
npm install bigjpg-open
```

Requer Node.js 18+ (usa `fetch` nativo).

## Uso

```ts
import { readFile } from "node:fs/promises"

import { BigjpgOpen } from "bigjpg-open"

const client = new BigjpgOpen()

// A partir de uma URL (baixada e enviada ao Bigjpg)
const task = await client.enlarge({ input: "https://github.com/marcuth.png", scale: 2, style: "photo", noise: 1 })
console.log(task.url)

// A partir de um arquivo local
await client.enlarge({
    input: { data: await readFile("image.png"), filename: "image.png", filetype: "image/png" },
})
```

### Controle manual

```ts
const { fileUrl } = await client.upload({ data, filename: "a.png", filetype: "image/png" })
const { tid } = await client.createTask({ input: fileUrl, fileName: "a.png", fileSize, width, height })
const task = await client.waitForTask(tid) // ou client.getTask(tid)
```

## Opções

| Opção   | Valores                      | Padrão  |
| ------- | ---------------------------- | ------- |
| `style` | `"art"`, `"photo"`           | `"art"` |
| `noise` | `-1` (nenhum) a `3` (máximo) | `0`     |
| `scale` | `2`, `4`, `8`, `16`          | `2`     |

Largura e altura são lidas do cabeçalho de PNG, JPEG, GIF e WebP; para outros formatos, informe `width` e `height`.

## Erros

Falhas lançam `BigjpgError` com `code`: o `status` devolvido pelo site, ou `upload_failed`, `download_failed`, `unknown_image_size`, `task_failed`, `timeout`.

## Licença

MIT
