import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notifications } from "@mantine/notifications";
import api from "../services/api";

export interface StockItem {
  id: string;
  name: string;
  category_id?: string;
  category_name?: string;
  description?: string;
  unit: string;
  current_stock: number;
  min_stock: number;
  max_stock: number;
  price: number;
  location?: string;
  tax_rate: number;
  irpf_rate: number;
  is_active: boolean;
  created_at: string;
}

export interface StockCategory {
  id: string;
  name: string;
  icon?: string;
}

export interface StockMovement {
  id: string;
  item_id: string;
  movement_type: string;
  quantity: number;
  previous_stock: number;
  new_stock: number;
  reason: string;
  created_by?: string;
  created_at: string;
}

export interface StockSummary {
  total_items: number;
  low_stock_count: number;
  total_value: number;
  movements_today: number;
}

export function useStockItems(search = "", categoryId?: string, lowStock = false) {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (categoryId) params.set("category_id", categoryId);
  if (lowStock) params.set("low_stock", "true");
  return useQuery<StockItem[]>({
    queryKey: ["stock-items", search, categoryId, lowStock],
    queryFn: async () => (await api.get(`/stock/items?${params}`)).data,
  });
}

export function useStockCategories() {
  return useQuery<StockCategory[]>({
    queryKey: ["stock-categories"],
    queryFn: async () => (await api.get("/stock/categories")).data,
  });
}

export function useStockSummary() {
  return useQuery<StockSummary>({
    queryKey: ["stock-summary"],
    queryFn: async () => (await api.get("/stock/summary")).data,
  });
}

export function useItemMovements(itemId?: string) {
  return useQuery<StockMovement[]>({
    queryKey: ["stock-movements", itemId],
    queryFn: async () => (await api.get(`/stock/items/${itemId}/movements`)).data,
    enabled: !!itemId,
  });
}

export function useCreateStockItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<StockItem>) => (await api.post("/stock/items", data)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stock-items"] });
      qc.invalidateQueries({ queryKey: ["stock-summary"] });
      notifications.show({ title: "Elemento creado", message: "Se ha añadido al inventario", color: "green" });
    },
  });
}

export function useUpdateStockItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<StockItem> & { id: string }) => (await api.put(`/stock/items/${id}`, data)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stock-items"] });
      qc.invalidateQueries({ queryKey: ["stock-summary"] });
      notifications.show({ title: "Elemento actualizado", message: "Los cambios se han guardado", color: "green" });
    },
  });
}

export function useDeleteStockItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.delete(`/stock/items/${id}`)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stock-items"] });
      qc.invalidateQueries({ queryKey: ["stock-summary"] });
      notifications.show({ title: "Elemento eliminado", message: "Se ha eliminado del inventario", color: "red" });
    },
  });
}

export function useRegisterMovement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ itemId, ...data }: { itemId: string; movement_type: string; quantity: number; reason: string }) =>
      (await api.post(`/stock/items/${itemId}/movements`, data)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stock-items"] });
      qc.invalidateQueries({ queryKey: ["stock-summary"] });
      qc.invalidateQueries({ queryKey: ["stock-movements"] });
      notifications.show({ title: "Movimiento registrado", message: "El stock se ha actualizado", color: "green" });
    },
  });
}

export function useCreateStockCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { name: string; icon?: string }) => (await api.post("/stock/categories", data)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stock-categories"] });
      notifications.show({ title: "Categoría creada", message: "Se ha creado la categoría", color: "green" });
    },
  });
}
