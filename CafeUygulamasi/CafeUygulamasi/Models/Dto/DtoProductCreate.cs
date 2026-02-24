namespace CafeUygulamasi.Models.Dto
{
	public class DtoProductCreate
	{
		public string Name { get; set; }
		public string Description { get; set; }
		public decimal Price { get; set; }
		public decimal? DiscountedPrice { get; set; }
		public bool InStock { get; set; }
		public string ImageUrl { get; set; }
		public DtoProductNutrition? Nutrition { get; set; }
	}
}
