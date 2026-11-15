export const BANGLADESH_DISTRICTS: Record<string, string[]> = {
  Gaibandha: ['Palashbari', 'Gaibandha Sadar', 'Gobindaganj', 'Sadullapur', 'Sundarganj', 'Fulchhari', 'Saghata'],
  Dhaka: ['Dhanmondi', 'Gulshan', 'Banani', 'Uttara', 'Mirpur', 'Mohammadpur', 'Motijheel', 'Savar', 'Keraniganj'],
  Chattogram: ['Kotwali', 'Panchlaish', 'Halishahar', 'Agrabad', 'Pahartali', 'Patenga', 'Sitakunda', 'Hathazari'],
  Sylhet: ['Sylhet Sadar', 'Beanibazar', 'Golapganj', 'Zakiganj', 'Companiganj', 'Kanaighat'],
  Rajshahi: ['Boalia', 'Rajpara', 'Motihar', 'Shah Makhdum', 'Paba', 'Bagha', 'Godagari'],
  Rangpur: ['Rangpur Sadar', 'Mithapukur', 'Pirganj', 'Badarganj', 'Kaunia', 'Gangachara'],
  Khulna: ['Khulna Sadar', 'Sonadanga', 'Khalishpur', 'Daulatpur', 'Dumuria', 'Batiaghata'],
  Barishal: ['Barishal Sadar', 'Bakerganj', 'Babuganj', 'Banaripara', 'Gournadi', 'Mehendiganj'],
  Mymensingh: ['Mymensingh Sadar', 'Muktagachha', 'Trishal', 'Bhaluka', 'Gaffargaon', 'Fulbaria'],
  Cumilla: ['Cumilla Sadar', 'Daudkandi', 'Chandina', 'Laksam', 'Chauddagram', 'Muradnagar'],
  Bogura: ['Bogura Sadar', 'Sherpur', 'Shajahanpur', 'Sonatala', 'Gabtali', 'Shibganj'],
  Gazipur: ['Gazipur Sadar', 'Tongi', 'Kaliakair', 'Kapasia', 'Sreepur'],
  Narayanganj: ['Narayanganj Sadar', 'Fatullah', 'Siddhirganj', 'Bandar', 'Rupganj', 'Sonargaon'],
  Jessore: ['Jessore Sadar', 'Benapole', 'Jhikargachha', 'Abhaynagar', 'Manirampur'],
  Dinajpur: ['Dinajpur Sadar', 'Birganj', 'Parbatipur', 'Fulbari', 'Setabganj'],
  CoxsBazar: ["Cox's Bazar Sadar", 'Teknaf', 'Ukhiya', 'Chakaria', 'Ramu', 'Maheshkhali'],
};

export const ORDER_STAGES = [
  { key: 'pending', label: 'Order Placed', labelBn: 'অর্ডার সম্পন্ন' },
  { key: 'confirmed', label: 'Order Confirmed', labelBn: 'অর্ডার নিশ্চিত' },
  { key: 'processing', label: 'Processing', labelBn: 'প্রস্তুত হচ্ছে' },
  { key: 'ready_to_ship', label: 'Ready to Ship', labelBn: 'পাঠানোর জন্য প্রস্তুত' },
  { key: 'shipped', label: 'Shipped', labelBn: 'পাঠানো হয়েছে' },
  { key: 'out_for_delivery', label: 'Out for Delivery', labelBn: 'ডেলিভারির পথে' },
  { key: 'delivered', label: 'Delivered', labelBn: 'ডেলিভারি সম্পন্ন' },
] as const;

export function formatBDT(amount: number): string {
  return `৳${Math.round(amount).toLocaleString('en-BD')}`;
}

export function formatDateTimeBD(iso: string): string {
  try {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Dhaka',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}
