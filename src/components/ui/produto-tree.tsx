"use client"

import React, {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useState,
} from "react"
import * as AccordionPrimitive from "@radix-ui/react-accordion"
import { Package, ChevronRight, Edit, Trash2, Eye } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"

// Tipos específicos para produtos
type ProdutoTreeElement = {
  id: string
  nome: string
  descricao?: string
  preco_unitario: number
  quantidade_estoque: number
  e_materia_prima: boolean
  children?: ProdutoTreeElement[]
}

type TreeContextProps = {
  selectedId: string | undefined
  expandedItems: string[] | undefined
  indicator: boolean
  handleExpand: (id: string) => void
  selectItem: (id: string) => void
  setExpandedItems?: React.Dispatch<React.SetStateAction<string[] | undefined>>
  direction: "rtl" | "ltr"
  onEdit?: (produto: ProdutoTreeElement) => void
  onDelete?: (produto: ProdutoTreeElement) => void
  onView?: (produto: ProdutoTreeElement) => void
}

const TreeContext = createContext<TreeContextProps | null>(null)

const useTree = () => {
  const context = useContext(TreeContext)
  if (!context) {
    throw new Error("useTree must be used within a TreeProvider")
  }
  return context
}

interface TreeViewComponentProps extends React.HTMLAttributes<HTMLDivElement> { }

type Direction = "rtl" | "ltr" | undefined

type TreeViewProps = {
  initialSelectedId?: string
  indicator?: boolean
  elements?: ProdutoTreeElement[]
  initialExpandedItems?: string[]
  onEdit?: (produto: ProdutoTreeElement) => void
  onDelete?: (produto: ProdutoTreeElement) => void
  onView?: (produto: ProdutoTreeElement) => void
} & TreeViewComponentProps

const Tree = forwardRef<HTMLDivElement, TreeViewProps>(
  (
    {
      className,
      elements,
      initialSelectedId,
      initialExpandedItems,
      children,
      indicator = true,
      dir,
      onEdit,
      onDelete,
      onView,
      ...props
    },
    ref,
  ) => {
    const [selectedId, setSelectedId] = useState<string | undefined>(
      initialSelectedId,
    )
    const [expandedItems, setExpandedItems] = useState<string[] | undefined>(
      initialExpandedItems,
    )

    const selectItem = useCallback((id: string) => {
      setSelectedId(id)
    }, [])

    const handleExpand = useCallback((id: string) => {
      setExpandedItems((prev) => {
        if (prev?.includes(id)) {
          return prev.filter((item) => item !== id)
        }
        return [...(prev ?? []), id]
      })
    }, [])

    const direction = dir === "rtl" ? "rtl" : "ltr"

    return (
      <TreeContext.Provider
        value={{
          selectedId,
          expandedItems,
          handleExpand,
          selectItem,
          setExpandedItems,
          indicator,
          direction,
          onEdit,
          onDelete,
          onView,
        }}
      >
        <div className={cn("size-full", className)}>
          <ScrollArea
            ref={ref}
            className="h-full relative px-2"
            dir={dir as Direction}
          >
            <AccordionPrimitive.Root
              {...props}
              type="multiple"
              defaultValue={expandedItems}
              value={expandedItems}
              className="flex flex-col gap-1"
              onValueChange={(value) =>
                setExpandedItems((prev) => [...(prev ?? []), value[0]])
              }
              dir={dir as Direction}
            >
              {children}
            </AccordionPrimitive.Root>
          </ScrollArea>
        </div>
      </TreeContext.Provider>
    )
  },
)

Tree.displayName = "Tree"

const TreeIndicator = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const { direction } = useTree()

  return (
    <div
      dir={direction}
      ref={ref}
      className={cn(
        "h-full w-px bg-muted absolute left-1.5 rtl:right-1.5 py-3 rounded-md hover:bg-slate-300 duration-300 ease-in-out",
        className,
      )}
      {...props}
    />
  )
})

TreeIndicator.displayName = "TreeIndicator"

interface FolderComponentProps
  extends React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Item> { }

type FolderProps = {
  expandedItems?: string[]
  produto: ProdutoTreeElement
  isSelectable?: boolean
  isSelect?: boolean
} & FolderComponentProps

const Folder = forwardRef<
  HTMLDivElement,
  FolderProps & React.HTMLAttributes<HTMLDivElement>
>(
  (
    {
      className,
      produto,
      value,
      isSelectable = true,
      isSelect,
      children,
      ...props
    },
    ref,
  ) => {
    const {
      direction,
      handleExpand,
      expandedItems,
      indicator,
      setExpandedItems,
      onEdit,
      onDelete,
      onView,
    } = useTree()

    const formatCurrency = (value: number) => {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }).format(value)
    }

    return (
      <AccordionPrimitive.Item
        {...props}
        value={value}
        className="relative overflow-hidden h-full"
      >
        <div
          className={cn(
            `flex items-center gap-2 text-sm rounded-md p-2 hover:bg-accent/50 transition-colors`,
            className,
            {
              "bg-muted rounded-md": isSelect && isSelectable,
              "cursor-pointer": isSelectable,
              "cursor-not-allowed opacity-50": !isSelectable,
            },
          )}
        >
          <AccordionPrimitive.Trigger
            className="flex items-center gap-2 flex-1 text-left"
            disabled={!isSelectable}
            onClick={() => handleExpand(value)}
          >
            <ChevronRight
              className={cn(
                "size-4 transition-transform duration-200",
                expandedItems?.includes(value) && "rotate-90"
              )}
            />
            <Package className="size-4 text-blue-600" />
            <div className="flex-1 flex flex-col items-start">
              <span className="font-medium">{produto.nome}</span>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>{formatCurrency(produto.preco_unitario)}</span>
                <span className={cn(
                  "px-2 py-0.5 rounded-full text-xs",
                  produto.e_materia_prima
                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-200"
                    : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200"
                )}>
                  {produto.e_materia_prima ? 'Matéria-prima' : 'Produto'}
                </span>
              </div>
            </div>
          </AccordionPrimitive.Trigger>

          {/* Botões de ação */}
          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
            {onView && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => onView(produto)}
              >
                <Eye className="h-4 w-4" />
              </Button>
            )}
            {onEdit && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => onEdit(produto)}
              >
                <Edit className="h-4 w-4" />
              </Button>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                onClick={() => onDelete(produto)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        <AccordionPrimitive.Content className="text-sm data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down relative overflow-hidden h-full">
          {indicator && <TreeIndicator aria-hidden="true" />}
          <AccordionPrimitive.Root
            dir={direction}
            type="multiple"
            className="flex flex-col gap-1 py-1 ml-5 rtl:mr-5"
            defaultValue={expandedItems}
            value={expandedItems}
            onValueChange={(value) => {
              setExpandedItems?.((prev) => [...(prev ?? []), value[0]])
            }}
          >
            {children}
          </AccordionPrimitive.Root>
        </AccordionPrimitive.Content>
      </AccordionPrimitive.Item>
    )
  },
)

Folder.displayName = "Folder"

const File = forwardRef<
  HTMLDivElement,
  {
    value: string
    produto: ProdutoTreeElement
    handleSelect?: (id: string) => void
    isSelectable?: boolean
    isSelect?: boolean
  } & React.HTMLAttributes<HTMLDivElement>
>(
  (
    {
      value,
      produto,
      className,
      handleSelect,
      isSelectable = true,
      isSelect,
      children,
      ...props
    },
    ref,
  ) => {
    const { selectedId, selectItem, onEdit, onDelete, onView } = useTree()
    const isSelected = isSelect ?? selectedId === value

    const formatCurrency = (value: number) => {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }).format(value)
    }

    return (
      <AccordionPrimitive.Item value={value} className="relative">
        <div
          className={cn(
            "flex items-center gap-2 cursor-pointer text-sm p-2 rounded-md duration-200 ease-in-out hover:bg-accent/50",
            {
              "bg-muted": isSelected && isSelectable,
            },
            isSelectable ? "cursor-pointer" : "opacity-50 cursor-not-allowed",
            className,
          )}
        >
          <div
            className="flex items-center gap-2 flex-1"
            onClick={() => selectItem(value)}
          >
            <Package className="size-4 text-green-600" />
            <div className="flex-1 flex flex-col items-start">
              <span className="font-medium">{produto.nome}</span>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>{formatCurrency(produto.preco_unitario)}</span>
                <span className="text-green-600">Quantidade: {produto.quantidade_estoque || 0}</span>
              </div>
            </div>
          </div>

          {/* Botões de ação */}
          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
            {onView && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => onView(produto)}
              >
                <Eye className="h-4 w-4" />
              </Button>
            )}
            {onEdit && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => onEdit(produto)}
              >
                <Edit className="h-4 w-4" />
              </Button>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                onClick={() => onDelete(produto)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </AccordionPrimitive.Item>
    )
  },
)

File.displayName = "File"

export { Tree, Folder, File, type ProdutoTreeElement } 