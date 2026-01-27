import { Box, Center, Container, Loader } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconCheck } from "@tabler/icons-react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { PageHeader } from "../../components/common/PageHeader";
import { MealPlanDetailView } from "../../components/nutrition/MealPlanDetailView";
import { useSupabaseMealPlan, useClient } from "../../hooks/useSupabaseData";
import { generateMealPlanPDF } from "../../services/pdfGenerator";
import { useAuthStore } from "../../stores/auth";

export function MealPlanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const clientIdFromUrl = searchParams.get("clientId");
  const navigate = useNavigate();
  const { currentWorkspace, user } = useAuthStore();

  // Fetch meal plan data
  const { data: mealPlan, isLoading: isLoadingPlan } = useSupabaseMealPlan(id || "");

  // Fetch client data if plan has a client assigned
  const { data: client } = useClient(mealPlan?.client_id || "");

  const handleExportPDF = async () => {
    if (!mealPlan) return;

    try {
      notifications.show({
        id: "pdf-export",
        title: "Generando PDF",
        message: "Por favor espera mientras se genera el documento...",
        loading: true,
        autoClose: false,
      });

      // Generate PDF on client side
      const pdfData = {
        id: mealPlan.id,
        name: mealPlan.name,
        description: mealPlan.description,
        target_calories: mealPlan.target_calories || 2000,
        target_protein: mealPlan.target_protein || 150,
        target_carbs: mealPlan.target_carbs || 200,
        target_fat: mealPlan.target_fat || 70,
        plan: mealPlan.plan || { days: [] },
        supplements: mealPlan.supplements || [],
        notes: mealPlan.notes,
        nutritional_advice: mealPlan.nutritional_advice,
      };

      const clientData = client
        ? {
            first_name: client.first_name,
            last_name: client.last_name,
            weight_kg: client.weight_kg ? parseFloat(String(client.weight_kg)) : undefined,
            height_cm: client.height_cm ? parseFloat(String(client.height_cm)) : undefined,
            allergies: client.health_data?.allergies || [],
            intolerances: client.health_data?.intolerances || [],
            goals: client.goals,
          }
        : undefined;

      generateMealPlanPDF(pdfData, {
        workspaceName: currentWorkspace?.name || "Trackfiz",
        trainerName: user?.full_name || "Entrenador",
        client: clientData,
      });

      notifications.update({
        id: "pdf-export",
        title: "PDF Generado",
        message: "El documento se ha descargado correctamente",
        color: "green",
        icon: <IconCheck size={16} />,
        loading: false,
        autoClose: 3000,
      });
    } catch (error) {
      console.error("Error generating PDF:", error);
      notifications.update({
        id: "pdf-export",
        title: "Error",
        message: "No se pudo generar el PDF. Intenta de nuevo.",
        color: "red",
        loading: false,
        autoClose: 5000,
      });
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleEdit = () => {
    // Include clientId if editing a client's assigned plan
    const clientParam = clientIdFromUrl || mealPlan?.client_id;
    if (clientParam) {
      navigate(`/nutrition?edit=${id}&clientId=${clientParam}`);
    } else {
      navigate(`/nutrition?edit=${id}`);
    }
  };

  if (isLoadingPlan) {
    return (
      <Container py="xl" fluid px={{ base: "md", sm: "lg", lg: "xl", xl: 48 }}>
        <Center h="50vh">
          <Loader size="lg" />
        </Center>
      </Container>
    );
  }

  if (!mealPlan) {
    return (
      <Container py="xl" fluid px={{ base: "md", sm: "lg", lg: "xl", xl: 48 }}>
        <PageHeader
          breadcrumbs={[
            { label: "Nutrición", href: "/nutrition" },
            { label: "Plan no encontrado" },
          ]}
          title="Plan no encontrado"
        />
        <Box ta="center" py="xl">
          El plan nutricional solicitado no existe o no tienes acceso.
        </Box>
      </Container>
    );
  }

  // Map the data to the component format
  const mappedMealPlan = {
    id: mealPlan.id,
    name: mealPlan.name,
    description: mealPlan.description,
    target_calories: mealPlan.target_calories || 2000,
    target_protein: mealPlan.target_protein || 150,
    target_carbs: mealPlan.target_carbs || 200,
    target_fat: mealPlan.target_fat || 70,
    plan: mealPlan.plan || { days: [] },
    supplements: mealPlan.supplements || [],
    notes: mealPlan.notes,
    nutritional_advice: mealPlan.nutritional_advice,
  };

  // Map client data if available
  const mappedClient = client
    ? {
        id: client.id,
        first_name: client.first_name,
        last_name: client.last_name,
        gender: (client.gender as "male" | "female") || "male",
        age: client.birth_date
          ? Math.floor((Date.now() - new Date(client.birth_date).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
          : 30,
        weight_kg: parseFloat(client.weight_kg) || 70,
        height_cm: parseFloat(client.height_cm) || 175,
        activity_level: (client.health_data?.activity_level as any) || "moderate",
        body_tendency: (client.health_data?.body_tendency as any) || "normal",
        goal_type: (client.health_data?.goal_type as any) || "maintenance",
        goal_weight_kg: client.health_data?.goal_weight_kg || parseFloat(client.weight_kg) || 70,
        allergies: client.health_data?.allergies || [],
        intolerances: client.health_data?.intolerances || [],
      }
    : undefined;

  return (
    <Container py="xl" fluid px={{ base: "md", sm: "lg", lg: "xl", xl: 48 }}>
      <PageHeader
        breadcrumbs={[
          { label: "Nutrición", href: "/nutrition" },
          { label: mealPlan.name },
        ]}
        title=""
      />

      <MealPlanDetailView
        mealPlan={mappedMealPlan}
        client={mappedClient}
        onExportPDF={handleExportPDF}
        onPrint={handlePrint}
        onEdit={handleEdit}
      />
    </Container>
  );
}

export default MealPlanDetailPage;
