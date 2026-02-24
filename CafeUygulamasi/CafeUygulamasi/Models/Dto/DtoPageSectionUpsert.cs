namespace CafeUygulamasi.Models.Dto
{
	public class DtoPageSectionUpsert
	{
		public string Title { get; set; } = string.Empty;
		public string Description { get; set; } = string.Empty;
		public string ImageUrl { get; set; } = string.Empty;
		public List<string> Tags { get; set; } = [];
	}
}
