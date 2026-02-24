namespace CafeUygulamasi.Models.Dto
{
	public class DtoContactRequestCreate
	{
		public string FullName { get; set; }
		public string PhoneOrEmail { get; set; }
		public string Type { get; set; }
		public string Message { get; set; }
	}
}
