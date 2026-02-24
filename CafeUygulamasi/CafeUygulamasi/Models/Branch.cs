using System.ComponentModel.DataAnnotations.Schema;

namespace CafeUygulamasi.Models
{
	public class Branch
	{
		public string Id { get; set; } = Guid.NewGuid().ToString();
		public string Name { get; set; }
		public string ImageUrl { get; set; }
		public string City { get; set; }
		public string District { get; set; }
		public bool IsOpen { get; set; }
		public BranchLocation? Location { get; set; }
		public List<BranchWorkingHour> WorkingHours { get; set; } = new();
		public BranchOrderLinks OrderLinks { get; set; } = new();
	}

	public class BranchLocation
	{
		public decimal Lat { get; set; }
		public decimal Lon { get; set; }
	}

	public class BranchWorkingHour
	{
		public string Day { get; set; }
		[NotMapped]
		public bool IsOpen { get; set; } = true;
		public string Open { get; set; }
		public string Close { get; set; }
	}

	public class BranchOrderLinks
	{
		public bool HasValue { get; set; } = true;
		public string? Yemeksepeti { get; set; }
		public string? Getir { get; set; }
		public string? TrendyolYemek { get; set; }
	}
}
