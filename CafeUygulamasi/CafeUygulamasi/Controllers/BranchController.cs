using CafeUygulamasi.Data;
using CafeUygulamasi.Models;
using CafeUygulamasi.Models.Dto;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Globalization;

namespace CafeUygulamasi.Controllers
{
	[ApiController]
	[Route("api/v1/branches")]
	public class BranchController : Controller
	{
		private readonly CafeDbContext _context;

		public BranchController(CafeDbContext context)
		{
			_context = context;
		}

		// ================= GET ALL =================
		[HttpGet]
		[AllowAnonymous]
		public async Task<IActionResult> GetAll()
		{
			var branches = await _context.Branches
				.AsNoTracking()
				.Include(b => b.WorkingHours)
				.ToListAsync();

			return Ok(new
			{
				success = true,
				data = branches.Select(MapBranchResponse),
				meta = new { count = branches.Count }
			});
		}

		// ================= GET BY ID =================
		[HttpGet("{id}")]
		[AllowAnonymous]
		public async Task<IActionResult> GetById(string id)
		{
			var branch = await _context.Branches
				.AsNoTracking()
				.Include(b => b.WorkingHours)
				.FirstOrDefaultAsync(b => b.Id == id);

			if (branch == null)
				return NotFound(new { success = false, message = "Branch not found" });

			return Ok(new { success = true, data = MapBranchResponse(branch) });
		}

		// ================= CREATE =================
		[HttpPost]
		public async Task<IActionResult> Create(DtoBranchCreate dto)
		{
			var branch = new Branch
			{
				Name = dto.Name,
				ImageUrl = dto.ImageUrl,
				City = dto.City,
				District = dto.District,
				IsOpen = dto.IsOpen,
				Location = dto.Location,
				WorkingHours = dto.WorkingHours ?? new(),
				OrderLinks = dto.OrderLinks ?? new BranchOrderLinks()
			};

			_context.Branches.Add(branch);
			await _context.SaveChangesAsync();

			return Ok(new { success = true, data = MapBranchResponse(branch) });
		}

		// ================= UPDATE (FIXED) =================
		[HttpPut("{id}")]
		public async Task<IActionResult> Update(string id, DtoBranchUpdate dto)
		{
			var branch = await _context.Branches
				.Include(b => b.WorkingHours)
				.FirstOrDefaultAsync(b => b.Id == id);

			if (branch == null)
				return NotFound(new { success = false, message = "Branch not found" });

			// 🔥 scalar alanlar
			branch.Name = dto.Name;
			branch.ImageUrl = dto.ImageUrl;
			branch.City = dto.City;
			branch.District = dto.District;
			branch.IsOpen = dto.IsOpen;
			branch.Location = dto.Location;
			branch.OrderLinks = dto.OrderLinks ?? new BranchOrderLinks();

			// 🔥 EN KRİTİK FIX — Owned collection update
			branch.WorkingHours.Clear();

			if (dto.WorkingHours != null && dto.WorkingHours.Count > 0)
			{
				foreach (var wh in dto.WorkingHours)
				{
					branch.WorkingHours.Add(new BranchWorkingHour
					{
						Day = wh.Day,
						IsOpen = wh.IsOpen,
						Open = wh.Open,
						Close = wh.Close
					});
				}
			}

			await _context.SaveChangesAsync();

			return Ok(new { success = true, data = MapBranchResponse(branch) });
		}

		// ================= DELETE =================
		[HttpDelete("{id}")]
		public async Task<IActionResult> Delete(string id)
		{
			var branch = await _context.Branches.FindAsync(id);

			if (branch == null)
				return NotFound(new { success = false, message = "Branch not found" });

			_context.Branches.Remove(branch);
			await _context.SaveChangesAsync();

			return Ok(new
			{
				success = true,
				data = new { deleted = true, id }
			});
		}

		// ================= MAPPER =================
		private static object MapBranchResponse(Branch branch)
		{
			return new
			{
				branch.Id,
				branch.Name,
				branch.ImageUrl,
				branch.City,
				branch.District,
				branch.IsOpen,
				branch.Location,
				WorkingHours = branch.WorkingHours ?? new List<BranchWorkingHour>(),
				branch.OrderLinks
			};
		}
	}
}