"use server";

export async function submitContactMessage(formData: FormData) {
  try {
    const name = formData.get("name") as string;
    const phone = formData.get("phone") as string;
    const message = formData.get("message") as string;

    if (!name || !phone || !message) {
      return { error: "جميع الحقول مطلوبة" };
    }

    // Call the backend API
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://api.al-awal.online/api/v1'}/contact-messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name, phone, message }),
    });

    if (!response.ok) {
      throw new Error("Failed to submit");
    }

    return { success: true };
  } catch (error) {
    console.error("Error submitting contact message:", error);
    return { error: "حدث خطأ أثناء إرسال الرسالة، يرجى المحاولة مرة أخرى." };
  }
}
