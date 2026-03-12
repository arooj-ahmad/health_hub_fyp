import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/DashboardLayout';
import ConsultationChat from '@/components/ConsultationChat';

const ConsultationChatPage = () => {
  const { nutritionistId } = useParams();
  const navigate = useNavigate();

  return (
    <DashboardLayout>
      <ConsultationChat
        nutritionistId={nutritionistId}
        onBack={() => navigate(-1)}
      />
    </DashboardLayout>
  );
};

export default ConsultationChatPage;
