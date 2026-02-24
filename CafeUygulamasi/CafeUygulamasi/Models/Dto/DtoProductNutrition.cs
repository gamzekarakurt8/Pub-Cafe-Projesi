namespace CafeUygulamasi.Models.Dto
{
	public class DtoProductNutrition
	{
		public string? ServingSize { get; set; }
		public int? CaloriesKcal { get; set; }
		public DtoProductMacros? Macros { get; set; }
		public DtoProductNutritionDetails? Details { get; set; }
		public List<string>? Allergens { get; set; }
	}

	public class DtoProductMacros
	{
		public decimal? ProteinG { get; set; }
		public decimal? CarbsG { get; set; }
		public decimal? FatG { get; set; }
	}

	public class DtoProductNutritionDetails
	{
		public decimal? SugarG { get; set; }
		public decimal? FiberG { get; set; }
		public decimal? SodiumMg { get; set; }
		public int? EnergyKj { get; set; }
	}
}
